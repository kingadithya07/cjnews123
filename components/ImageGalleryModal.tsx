
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Loader2, ImageIcon, AlertCircle, Upload } from 'lucide-react';
import { FileObject } from 'https://esm.sh/@supabase/storage-js@2.5.5';
import { generateId } from '../utils';

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (url: string) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelectImage }) => {
    const [images, setImages] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const BUCKET_NAME = 'images';
    // Fetch from both dedicated gallery and article header images
    const FOLDERS_TO_FETCH = ['gallery', 'articles']; 

    const fetchImages = async () => {
        setLoading(true);
        setError(null);
        try {
            const allImages: FileObject[] = [];
            for (const folder of FOLDERS_TO_FETCH) {
                const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });
                if (error) throw error;
                if (data) {
                    // Add folder path to name for URL generation
                    const prefixedData = data.map((file: any) => ({...file, name: `${folder}/${file.name}`}));
                    allImages.push(...prefixedData);
                }
            }
            // Sort all images together by creation date
            allImages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setImages(allImages);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch images from one or more sources.');
        } finally {
            setLoading(false);
        }
    };

    const handleMultipleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploads = Array.from(files).map(async (file: File) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `gallery/${generateId()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file);
                if (uploadError) throw uploadError;
                return fileName;
            });

            await Promise.all(uploads);
            await fetchImages(); // Refresh list after upload
        } catch (err: any) {
            alert('Error uploading images: ' + err.message);
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchImages();
        }
    }, [isOpen]);

    const getPublicUrl = (imagePath: string): string => {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(imagePath);
        return data.publicUrl;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-gray-800">Media Library</h3>
                        <label className="flex items-center gap-2 bg-news-black text-white px-3 py-1.5 rounded text-xs font-bold uppercase cursor-pointer hover:bg-gray-800 transition-colors">
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                multiple 
                                onChange={handleMultipleUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-black"><X size={20}/></button>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <Loader2 size={32} className="animate-spin mr-3" />
                            <span>Loading Media...</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-500 bg-red-50 p-4 rounded-lg">
                            <AlertCircle size={24} className="mr-3" />
                            <span>{error}</span>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-center">
                            <div>
                                <ImageIcon size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>No images found in your library.</p>
                                <p className="text-xs mt-2">Click "Upload Files" to add images.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {images.map(image => {
                                const publicUrl = getPublicUrl(image.name);
                                return (
                                    <button 
                                        key={image.id} 
                                        onClick={() => onSelectImage(publicUrl)}
                                        className="group relative aspect-square bg-gray-100 rounded-md overflow-hidden border-2 border-transparent hover:border-news-accent focus:border-news-accent focus:outline-none transition-all"
                                    >
                                        <img src={publicUrl} alt={image.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-white text-xs font-bold uppercase">Select</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="px-6 py-3 bg-gray-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGalleryModal;
