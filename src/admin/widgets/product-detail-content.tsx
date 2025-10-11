import { defineWidgetConfig } from "@medusajs/admin-sdk";
import React, { useState, useEffect, useRef } from "react";
import type { AdminProduct } from "@medusajs/framework/types";

interface ProductDetailWidgetProps {
  readonly data?: AdminProduct;
}

function ProductDetailWidget({ data }: ProductDetailWidgetProps) {
  const [content, setContent] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const product = data;

  useEffect(() => {
    if (product) {
      setContent((product.metadata?.detail_content as string) || "");
      const savedImages = (product.metadata?.detail_images as string) || "";
      setUploadedImages(savedImages ? savedImages.split(",").filter(Boolean) : []);
    }
  }, [product]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/admin/uploads', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newImages = result.uploads?.map((upload: any) => upload.url) || [];
        setUploadedImages(prev => [...prev, ...newImages]);
      } else {
        alert("圖片上傳失敗，請重試");
      }
    } catch (error) {
      console.error("上傳圖片時發生錯誤:", error);
      alert("圖片上傳失敗，請重試");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!product?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/admin/products/${product.id}/detail-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          detail_content: content,
          detail_images: uploadedImages.join(","),
        }),
      });

      if (response.ok) {
        alert("產品詳情已成功保存！");
      } else {
        alert("保存失敗，請重試");
      }
    } catch (error) {
      console.error("保存產品詳情時發生錯誤:", error);
      alert("保存失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div style={{ padding: "16px" }}>
        <h2>產品詳情編輯器</h2>
        <p>載入產品資料中...</p>
      </div>
    );
  }

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-ui-fg-base text-lg font-medium">
          產品詳情編輯器
        </h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="detail-content" className="block text-ui-fg-base text-sm font-medium mb-2">
            詳細內容
          </label>
          <textarea
            id="detail-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="輸入產品的詳細說明..."
            rows={6}
            className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field text-ui-fg-base placeholder:text-ui-fg-muted focus:border-ui-border-interactive focus:ring-1 focus:ring-ui-border-interactive resize-vertical"
          />
        </div>

        <div>
          <label htmlFor="image-upload" className="block text-ui-fg-base text-sm font-medium mb-2">
            產品圖片
          </label>
          
          {/* 圖片上傳區域 */}
          <div className="border-2 border-dashed border-ui-border-base rounded-lg p-6 text-center">
            <input
              id="image-upload"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-ui-border-base rounded-md bg-ui-bg-base text-ui-fg-base hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive disabled:opacity-50"
            >
              {uploading ? "上傳中..." : "選擇圖片"}
            </button>
            <p className="mt-2 text-sm text-ui-fg-muted">
              支援 JPG, PNG, GIF 格式，可選擇多個檔案
            </p>
          </div>

          {/* 已上傳的圖片預覽 */}
          {uploadedImages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-ui-fg-base mb-2">已上傳的圖片</h4>
              <div className="grid grid-cols-3 gap-4">
                {uploadedImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`產品圖片 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md border border-ui-border-base"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-ui-bg-overlay text-ui-fg-on-color rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading || uploading}
          className="w-full px-4 py-2 bg-ui-button-primary text-ui-fg-on-color rounded-md font-medium hover:bg-ui-button-primary-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "保存中..." : "保存詳情"}
        </button>
      </div>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductDetailWidget;
