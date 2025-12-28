
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generateId } from '../utils';
import { Upload, ImageIcon, Copy, Trash2, Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { FileObject } from 'https://esm.sh/@supabase/storage-js@2.5.5';

const ImageTools: React.FC = () => {
    const [images, setImages] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const BUCKET_NAME = 'images';
    const FOLDER_NAME = 'gallery';

    const fetchImages = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.storage.from(BUCKET_NAME).list(FOLDER_NAME, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            if (error) throw error;
            if (data) setImages(data);
        } catch (err: unknown) {
            // Fix: Improve type safety in catch block
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch images.');
            } else {
                setError('Failed to fetch images.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);
        try {
            const uploadPromises = Array.from(files).map(file => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${generateId()}.${fileExt}`;
                const filePath = `${FOLDER_NAME}/${fileName}`;
                return supabase.storage.from(BUCKET_NAME).upload(filePath, file);
            });

            const results = await Promise.all(uploadPromises);
            
            const uploadError = results.find(result => result.error);
            if (uploadError && uploadError.error) {
                throw uploadError.error;
            }
            
            // Refresh the list
            await fetchImages();

        } catch (err: unknown) {
            // FIX: Safely handle caught error by checking if it's an Error instance before accessing its properties.
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(`Upload failed. Some files may not have been saved.`);
            }
        } finally {
            setUploading(false);
            if (e.target) e.target.value = ''; // Reset file input
        }
    };

    const handleDelete = async (imageName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${imageName}? This cannot be undone.`)) return;
        
        try {
            const { error } = await supabase.storage.from(BUCKET_NAME).remove([`${FOLDER_NAME}/${imageName}`]);
            if (error) throw error;
            setImages(prev => prev.filter(img => img.name !== imageName));
        } catch (err: unknown) {
            // Fix: Improve type safety in catch block
            if (err instanceof Error) {
                setError(err.message || 'Failed to delete image.');
            } else {
                setError('Failed to delete image.');
            }
        }
    };

    const getPublicUrl = (imageName: string): string => {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`${FOLDER_NAME}/${imageName}`);
        return data.publicUrl;
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <ImageIcon className="w-8 h-8 text-news-accent"/>
                    <h1 className="font-serif text-3xl font-bold text-gray-900">Image Tools</h1>
                </div>
                <label className="bg-news-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-3 rounded flex items-center gap-2 cursor-pointer transition-colors w-full md:w-auto justify-center">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span>{uploading ? 'Uploading...' : 'Upload New Images'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} multiple />
                </label>
            </div>
            
            {error && <div className="bg-red-50 text-red-700 p-3 rounded text-xs mb-4 flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}

            <div className="bg-white rounded-lg border overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={32} className="animate-spin mb-4" />
                        <span className="text-sm font-medium">Loading Image Library...</span>
                    </div>
                ) : images.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">
                        <ImageIcon size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="font-bold">No images found in the gallery.</p>
                        <p className="text-sm">Use the upload button to add some.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
                        {images.map(image => {
                            const publicUrl = getPublicUrl(image.name);
                            return (
                                <div key={image.id} className="group relative aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200 shadow-sm">
                                    <img src={publicUrl} alt={image.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                        <p className="text-white text-[10px] font-mono break-all truncate">{image.name}</p>
                                        <div className="flex items-center gap-1 mt-2">
                                            <button onClick={() => copyToClipboard(publicUrl)} className="flex-1 bg-gray-200 hover:bg-white text-black p-1 rounded-sm text-xs">
                                                {copiedUrl === publicUrl ? <CheckCircle size={14} className="mx-auto text-green-600"/> : <Copy size={14} className="mx-auto"/>}
                                            </button>
                                            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gray-200 hover:bg-white text-black p-1 rounded-sm text-xs">
                                                <ExternalLink size={14} className="mx-auto"/>
                                            </a>
                                            <button onClick={() => handleDelete(image.name)} className="flex-1 bg-red-600 hover:bg-red-500 text-white p-1 rounded-sm text-xs">
                                                <Trash2 size={14} className="mx-auto"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageTools;
