import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { FileObject } from 'https://esm.sh/@supabase/storage-js@2.5.5';

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (url: string) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelectImage }) => {
    const [images, setImages] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(false);
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
                    const prefixedData = data.map(file => ({...file, name: `${folder}/${file.name}`}));
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
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Choose from Media Library</h3>
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