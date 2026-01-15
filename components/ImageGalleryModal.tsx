
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, Loader2, ImageIcon, AlertCircle, Upload, Trash2, FolderLock, Crop, RotateCw, ZoomIn, ZoomOut, Check, ArrowLeft, Maximize, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { FileObject } from 'https://esm.sh/@supabase/storage-js@2.5.5';
import { generateId } from '../utils';
import Cropper from 'cropperjs';

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (url: string) => void;
    uploadFolder?: string;
    userId?: string | null; // For isolation
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelectImage, uploadFolder = 'gallery', userId }) => {
    const [images, setImages] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    // Editor State
    const [editMode, setEditMode] = useState(false);
    const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState<string>('image');
    
    const cropperRef = useRef<Cropper | null>(null);
    const imageElementRef = useRef<HTMLImageElement>(null);

    const BUCKET_NAME = 'images';

    const getFoldersToFetch = () => {
        // Determine folders based on context to ensure isolation (e.g., Ads shouldn't see Article images)
        let targetFolders = [uploadFolder];

        // Exception: Articles usually benefit from access to general 'gallery' assets too
        if (uploadFolder === 'articles') {
            targetFolders.push('gallery');
        }
        
        // Exception: If looking at root 'gallery', maybe show 'branding' too
        if (uploadFolder === 'gallery') {
            targetFolders.push('branding');
        }

        // Apply User ID isolation prefix if present
        if (userId) {
            return targetFolders.map(f => `users/${userId}/${f}`);
        }
        
        // Fallback for global/admin assets if no user ID
        return targetFolders;
    };

    const fetchImages = async () => {
        setLoading(true);
        setError(null);
        try {
            const allImages: FileObject[] = [];
            const folders = getFoldersToFetch();

            for (const folder of folders) {
                const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });
                if (error) {
                    console.error(`Error fetching folder ${folder}:`, error);
                    continue; 
                }
                if (data) {
                    // Ensure we construct the full path correctly for the name property
                    const files = data
                        .filter((item: any) => item.id !== null) 
                        .map((file: any) => ({
                            ...file, 
                            name: `${folder}/${file.name}`, // Store full path as name for deletion/access
                            shortName: file.name // Store distinct filename
                        }));
                    allImages.push(...files);
                }
            }
            allImages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setImages(allImages);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch images.');
        } finally {
            setLoading(false);
        }
    };

    // --- EDITOR LOGIC ---

    const handleFileUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create local preview for editing
        const url = URL.createObjectURL(file);
        setFileName(file.name.split('.')[0]);
        setEditImageUrl(url);
        setEditMode(true);
        e.target.value = ''; // Reset input
    };

    const handleEditExisting = async (imagePath: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const publicUrl = getPublicUrl(imagePath);
        
        // Need to fetch as blob to avoid CORS in canvas if possible, or use crossOrigin
        try {
            setLoading(true);
            const response = await fetch(publicUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setFileName(`edit_${generateId()}`);
            setEditImageUrl(url);
            setEditMode(true);
        } catch (err) {
            alert("Could not load image for editing.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (editMode && editImageUrl && imageElementRef.current) {
            if (cropperRef.current) cropperRef.current.destroy();
            
            const cropper = new Cropper(imageElementRef.current, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                modal: true,
                guides: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                background: false // Transparent bg
            } as any);
            cropperRef.current = cropper;
        }
        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [editMode, editImageUrl]);

    const rotate = (deg: number) => cropperRef.current?.rotate(deg);
    const zoom = (ratio: number) => cropperRef.current?.zoom(ratio);
    const setRatio = (ratio: number) => cropperRef.current?.setAspectRatio(ratio);

    const handleSaveCrop = async () => {
        if (!cropperRef.current) return;
        setIsProcessing(true);

        try {
            const canvas = cropperRef.current.getCroppedCanvas({
                maxWidth: 2048,
                maxHeight: 2048,
                fillColor: '#fff', // Avoid transparent PNG issues if converting to JPG
            });

            if (!canvas) throw new Error("Could not crop image");

            // Wrap canvas.toBlob in a Promise to await its result properly
            await new Promise<void>((resolve, reject) => {
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to create image blob"));
                        return;
                    }
                    
                    try {
                        const fileExt = 'jpg'; // Standardize on web
                        const prefix = userId ? `users/${userId}/` : '';
                        const finalPath = `${prefix}${uploadFolder}/${fileName}_${generateId()}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from(BUCKET_NAME)
                            .upload(finalPath, blob, { contentType: 'image/jpeg', upsert: false });

                        if (uploadError) {
                            reject(uploadError);
                            return;
                        }
                        
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 'image/jpeg', 0.9);
            });

            // Cleanup and Refresh only if upload succeeds
            setEditMode(false);
            setEditImageUrl(null);
            await fetchImages();

        } catch (err: any) {
            console.error("Save error:", err);
            alert("Error saving image: " + (err.message || "Unknown error"));
        } finally {
            setIsProcessing(false);
        }
    };


    const handleDelete = async (imageName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to permanently delete this image?")) return;
        
        setDeletingId(imageName);
        try {
            // Delete from storage
            const { data, error } = await supabase.storage.from(BUCKET_NAME).remove([imageName]);
            
            if (error) {
                console.error('Delete error:', error);
                throw error;
            }

            // Remove from local state immediately
            setImages(prev => prev.filter(img => img.name !== imageName));
            
        } catch (err: any) {
            console.error("Delete failed:", err);
            alert("Delete failed: " + (err.message || "Unknown error"));
            // If failure, refresh list to ensure consistency
            fetchImages();
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        if (isOpen) fetchImages();
    }, [isOpen, userId, uploadFolder]);

    const getPublicUrl = (imagePath: string): string => {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(imagePath);
        return data.publicUrl;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
            
            {/* --- EDITOR MODE --- */}
            {editMode ? (
                 <div className="bg-[#1a1a1a] rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#141414] shrink-0">
                         <div className="flex items-center gap-4">
                             <button onClick={() => { setEditMode(false); setEditImageUrl(null); }} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                 <ArrowLeft size={20} />
                             </button>
                             <div>
                                 <h3 className="font-bold text-white text-sm uppercase tracking-widest">Image Studio</h3>
                                 <p className="text-[10px] text-gray-500">Crop, Resize & Optimize</p>
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={handleSaveCrop} disabled={isProcessing} className="bg-news-gold text-black px-6 py-2 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-white transition-colors flex items-center gap-2">
                                 {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                 {isProcessing ? 'Processing...' : 'Save to Gallery'}
                             </button>
                         </div>
                    </div>

                    {/* Workspace */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Tools Sidebar */}
                        <div className="w-16 md:w-20 bg-[#111] border-r border-white/5 flex flex-col items-center py-6 gap-6 z-10 overflow-y-auto shrink-0">
                             <div className="flex flex-col gap-2 items-center w-full">
                                 <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ratio</span>
                                 <button onClick={() => setRatio(16/9)} className="p-3 text-gray-400 hover:text-news-gold hover:bg-white/5 rounded-lg transition-all" title="16:9 (Article)"><Monitor size={20}/></button>
                                 <button onClick={() => setRatio(4/3)} className="p-3 text-gray-400 hover:text-news-gold hover:bg-white/5 rounded-lg transition-all" title="4:3 (Standard)"><Maximize size={20}/></button>
                                 <button onClick={() => setRatio(1)} className="p-3 text-gray-400 hover:text-news-gold hover:bg-white/5 rounded-lg transition-all" title="1:1 (Square)"><Crop size={20}/></button>
                                 <button onClick={() => setRatio(9/16)} className="p-3 text-gray-400 hover:text-news-gold hover:bg-white/5 rounded-lg transition-all" title="9:16 (Story)"><Smartphone size={20}/></button>
                                 <button onClick={() => setRatio(NaN)} className="p-3 text-gray-400 hover:text-news-gold hover:bg-white/5 rounded-lg transition-all" title="Free"><Maximize size={20} className="rotate-45"/></button>
                             </div>
                             
                             <div className="w-8 h-[1px] bg-white/10 my-2"></div>

                             <div className="flex flex-col gap-2 items-center w-full">
                                 <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Edit</span>
                                 <button onClick={() => rotate(90)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><RotateCw size={20}/></button>
                                 <button onClick={() => zoom(0.1)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><ZoomIn size={20}/></button>
                                 <button onClick={() => zoom(-0.1)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><ZoomOut size={20}/></button>
                             </div>
                        </div>

                        {/* Canvas */}
                        <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-4 md:p-8">
                             {editImageUrl && (
                                 <img ref={imageElementRef} src={editImageUrl} alt="Editing" className="max-w-full max-h-full block" style={{ opacity: 0 }} />
                             )}
                        </div>
                    </div>
                 </div>
            ) : (
            /* --- GALLERY MODE --- */
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-news-gold/10 rounded-full flex items-center justify-center text-news-gold">
                             {userId ? <FolderLock size={20}/> : <ImageIcon size={20}/>}
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg leading-none">Media Library</h3>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                {userId ? 'Private Workspace' : 'Global Assets'} • {uploadFolder}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                         <button onClick={fetchImages} className="p-2.5 text-gray-500 hover:text-news-black hover:bg-gray-100 rounded-lg transition-colors" title="Refresh Gallery">
                             <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''}`} />
                         </button>
                         <label className="flex items-center gap-2 bg-news-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-gray-800 transition-colors shadow-lg">
                            <Upload size={14} />
                            <span>Upload New</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileUploadSelect}
                            />
                        </label>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <Loader2 size={32} className="animate-spin text-news-gold" />
                            <span className="text-xs font-bold uppercase tracking-widest">Loading Assets...</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-500 bg-red-50 p-6 rounded-xl border border-red-100">
                            <AlertCircle size={24} className="mr-3" />
                            <span className="font-medium">{error}</span>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center border-2 border-dashed border-gray-200 rounded-xl m-4">
                            <ImageIcon size={48} className="mx-auto mb-4 opacity-20"/>
                            <p className="font-serif text-lg text-gray-600">No images found.</p>
                            <p className="text-xs mt-2 uppercase tracking-wide">Upload an image to start cropping and editing.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {images.map(image => {
                                const publicUrl = getPublicUrl(image.name);
                                const isDeleting = deletingId === image.name;
                                const pathParts = image.name.split('/');
                                const displayFolder = pathParts.length > 2 ? pathParts[pathParts.length - 2] : pathParts[0];

                                return (
                                    <div key={image.id} className="group relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-news-gold hover:shadow-md transition-all">
                                        <div className="w-full h-full p-2">
                                            <img src={publicUrl} alt={image.name} className="w-full h-full object-contain" />
                                        </div>
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button 
                                                onClick={() => !isDeleting && onSelectImage(publicUrl)}
                                                className="bg-news-gold text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                                            >
                                                Select
                                            </button>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => handleEditExisting(image.name, e)}
                                                    className="p-2 bg-white/20 text-white rounded-full hover:bg-white hover:text-black transition-colors"
                                                    title="Edit/Crop"
                                                >
                                                    <Crop size={14} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(image.name, e)}
                                                    disabled={isDeleting}
                                                    className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    {isDeleting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute top-2 left-2 bg-gray-100 text-gray-500 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            {displayFolder}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

export default ImageGalleryModal;
