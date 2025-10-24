import { defineWidgetConfig } from "@medusajs/admin-sdk";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { AdminProduct } from "@medusajs/framework/types";
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

// Enhanced toolbar component
const MenuBar = ({ editor, onImageUploadClick, uploading }: { editor: Editor, onImageUploadClick: () => void, uploading: boolean }) => {
  if (!editor) {
    return null;
  }

  const buttonClass = "p-2 rounded-md hover:bg-ui-bg-base-hover disabled:opacity-50 text-sm";
  const isActiveClass = "bg-ui-bg-base-pressed";

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-ui-border-base bg-ui-bg-component">
      {/* 文字格式化 */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`${buttonClass} ${editor.isActive('bold') ? isActiveClass : ''}`}
        title="粗體"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`${buttonClass} ${editor.isActive('italic') ? isActiveClass : ''}`}
        title="斜體"
      >
        <em>I</em>
      </button>
      
      {/* 分隔符 */}
      <div className="w-px h-6 bg-ui-border-base mx-1"></div>
      
      {/* 標題 */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${buttonClass} ${editor.isActive('heading', { level: 2 }) ? isActiveClass : ''}`}
        title="標題 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${buttonClass} ${editor.isActive('heading', { level: 3 }) ? isActiveClass : ''}`}
        title="標題 3"
      >
        H3
      </button>
      
      {/* 分隔符 */}
      <div className="w-px h-6 bg-ui-border-base mx-1"></div>
      
      {/* 列表 */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${buttonClass} ${editor.isActive('bulletList') ? isActiveClass : ''}`}
        title="項目符號列表"
      >
        • 列表
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${buttonClass} ${editor.isActive('orderedList') ? isActiveClass : ''}`}
        title="編號列表"
      >
        1. 列表
      </button>
      
      {/* 分隔符 */}
      <div className="w-px h-6 bg-ui-border-base mx-1"></div>
      
      {/* 圖片功能 */}
      <button 
        onClick={onImageUploadClick} 
        disabled={uploading} 
        className={`${buttonClass} bg-ui-button-primary text-ui-fg-on-color hover:bg-ui-button-primary-hover`}
        title="上傳圖片"
      >
        {uploading ? "上傳中..." : "📷 添加圖片"}
      </button>
      
      {/* 圖片相關功能 */}
      {editor.isActive('image') && (
        <>
          <div className="w-px h-6 bg-ui-border-base mx-1"></div>
          <button
            onClick={() => {
              const url = prompt('請輸入圖片URL:');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
            className={buttonClass}
            title="插入圖片URL"
          >
            🔗 URL
          </button>
        </>
      )}
    </div>
  );
};

interface ProductDetailWidgetProps {
  readonly data?: AdminProduct;
}

function ProductDetailWidget({ data }: ProductDetailWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const product = data;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false, // Images will be on their own line
        allowBase64: true, // 允許 base64 圖片
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md', // 添加響應式樣式
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none w-full max-w-full p-4 min-h-[200px] border-none',
      },
    },
    onUpdate: ({ editor }) => {
      // 標記為有未保存的更改
      setHasUnsavedChanges(true);
      setJustSaved(false); // 清除"已保存"狀態
      console.log('Editor content updated');
    },
  });

  useEffect(() => {
    if (product && editor) {
      const initialContent = (product.metadata?.detail_content as string) || "";
      if (initialContent !== editor.getHTML()) {
        editor.commands.setContent(initialContent);
        setHasUnsavedChanges(false); // 載入初始內容時重設狀態
        setJustSaved(false); // 清除"已保存"狀態
      }
    }
  }, [product, editor]);

  // 添加鍵盤快捷鍵支援 (Ctrl+S 或 Cmd+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, editor]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !editor) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      console.log('🔄 開始上傳圖片...');
      
      // 使用 Medusa 預設的文件上傳 API
      const response = await fetch('/admin/files', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('📡 響應狀態:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("上傳失敗:", errorText);
        alert(`圖片上傳失敗: ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log("✅ 上傳成功:", result);

      // 插入圖片到編輯器 - 支援多種響應格式
      let uploadedFiles = [];
      if (result.files && Array.isArray(result.files)) {
        uploadedFiles = result.files;
      } else if (result.uploads && Array.isArray(result.uploads)) {
        uploadedFiles = result.uploads;
      } else if (result.data && Array.isArray(result.data)) {
        uploadedFiles = result.data;
      }

      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach((file: any) => {
          const imageUrl = file.url || file.path || file.src;
          if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
          }
        });
        alert(`成功上傳 ${uploadedFiles.length} 張圖片！`);
      } else {
        console.log("❌ 未找到上傳的文件或不支援的響應格式:", result);
        alert("上傳成功但無法取得圖片 URL");
      }
    } catch (error) {
      console.error("🚫 上傳錯誤:", error);
      alert(`上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setUploading(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [editor]);

  const handleSave = async () => {
    if (!product?.id || !editor) return;
    
    setLoading(true);
    try {
      const htmlContent = editor.getHTML();
      const response = await fetch(`/admin/products/${product.id}/detail-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ detail_content: htmlContent }),
        credentials: 'include', // 包含cookies用於身份驗證
      });

      if (response.ok) {
        console.log("✅ 產品詳情保存成功");
        setHasUnsavedChanges(false); // 保存成功後重設狀態
        setJustSaved(true); // 設置剛保存完成的狀態
        // 2秒後重設保存狀態
        setTimeout(() => {
          setJustSaved(false);
        }, 2000);
      } else {
        console.error("❌ 保存失敗:", response.status, response.statusText);
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
      <div className="p-4">
        <h2>產品詳情編輯器</h2>
        <p>載入產品資料中...</p>
      </div>
    );
  }

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-ui-border-base">
        <h2 className="text-ui-fg-base text-lg font-medium flex items-center gap-2">
          產品詳情編輯器
          {hasUnsavedChanges && (
            <span className="text-orange-500 text-sm">● 有未保存的更改</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ui-fg-muted">Ctrl+S</span>
          <button 
            onClick={handleSave} 
            disabled={loading || uploading}
            className="save-button-top px-4 py-2 border border-ui-border-base text-ui-fg-base rounded-md font-medium hover:bg-ui-bg-base disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? "保存中..." : justSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      
      <div className="border-b border-ui-border-base">
        {editor && <MenuBar editor={editor} onImageUploadClick={() => fileInputRef.current?.click()} uploading={uploading} />}
      </div>
      
      {/* 編輯器容器 */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="min-h-[300px] prose dark:prose-invert max-w-none"
        />
        {uploading && (
          <div className="absolute inset-0 bg-ui-bg-base bg-opacity-50 flex items-center justify-center">
            <div className="bg-ui-bg-component px-4 py-2 rounded-md shadow-md">
              📤 上傳圖片中...
            </div>
          </div>
        )}
      </div>
      
      {/* 隱藏的文件輸入 */}
      <input
        id="image-upload"
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      {/* 底部工具區域 */}
      <div className="p-4 border-t border-ui-border-base bg-ui-bg-subtle">
        <div className="flex justify-start">
          <button 
            onClick={() => {
              if (editor) {
                editor.commands.clearContent();
                setHasUnsavedChanges(true);
                setJustSaved(false); // 清除"已保存"狀態
              }
            }}
            disabled={loading || uploading}
            className="px-4 py-2 border border-ui-border-base text-ui-fg-muted rounded-md font-medium hover:bg-ui-bg-base disabled:opacity-50"
          >
            清空內容
          </button>
        </div>
      </div>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductDetailWidget;
