import { defineWidgetConfig } from "@medusajs/admin-sdk";
import React, { useState, useEffect, useRef } from "react";
import type { AdminProduct } from "@medusajs/framework/types";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Button,
  Text,
  Heading,
  StatusBadge,
  Container,
  clx
} from "@medusajs/ui";

// --------------------------------------------------------------------------
// Icons (Premium SVG Set)
// --------------------------------------------------------------------------
const Icons = {
  Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>,
  Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>,
  List: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  ListOrdered: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>,
  Heading1: () => <span className="font-bold text-[10px]">H1</span>,
  Heading2: () => <span className="font-bold text-[10px]">H2</span>,
  Heading3: () => <span className="font-bold text-[10px]">H3</span>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  ArrowUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>,
  ArrowDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  Type: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
  Image: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Grip: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" /></svg>,
};

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------
type Block = {
  id: string;
  type: "text" | "image";
  content: string; // HTML for text, URL for image
};

// --------------------------------------------------------------------------
// Control Components
// --------------------------------------------------------------------------
const BlockControls = ({ index, total, onMove, onRemove, typeLabel }: any) => (
  <div className="flex items-center gap-1.5 ml-auto">
    <div className="flex bg-ui-bg-base border border-ui-border-base rounded-md overflow-hidden shadow-sm">
      <button
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        className="w-8 h-8 flex items-center justify-center hover:bg-ui-bg-base-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-ui-border-base"
        type="button"
      >
        <Icons.ArrowUp />
      </button>
      <button
        onClick={() => onMove(index, index + 1)}
        disabled={index === total - 1}
        className="w-8 h-8 flex items-center justify-center hover:bg-ui-bg-base-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        type="button"
      >
        <Icons.ArrowDown />
      </button>
    </div>
    <div className="w-px h-4 bg-ui-border-base mx-0.5" />
    <button
      onClick={onRemove}
      className="w-8 h-8 flex items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:text-ui-fg-error hover:bg-ui-bg-error-hover hover:border-ui-border-error transition-all"
      type="button"
    >
      <Icons.Trash />
    </button>
  </div>
);

// --------------------------------------------------------------------------
// Text Block Component
// --------------------------------------------------------------------------
const TextBlock = ({
  content,
  onChange,
  index,
  total,
  onMove,
  onRemove
}: {
  content: string;
  onChange: (val: string) => void;
  index: number;
  total: number;
  onMove: (f: number, t: number) => void;
  onRemove: () => void;
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    injectCSS: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none w-full p-8 text-ui-fg-base text-[15px] leading-relaxed prose dark:prose-invert max-w-none min-h-[100px]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="group relative border-b border-ui-border-base last:border-b-0 bg-ui-bg-base hover:bg-ui-bg-subtle/30 transition-colors">
      <div className="flex items-center px-4 py-2 bg-ui-bg-subtle/50 border-b border-ui-border-base opacity-0 group-hover:opacity-100 transition-opacity sticky top-0 z-20">
        <div className="flex items-center gap-1">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={clx("w-8 h-8 flex items-center justify-center rounded-md hover:bg-ui-bg-base", editor.isActive('bold') ? 'text-ui-fg-interactive bg-ui-bg-base' : 'text-ui-fg-subtle')} type="button"><Icons.Bold /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={clx("w-8 h-8 flex items-center justify-center rounded-md hover:bg-ui-bg-base", editor.isActive('italic') ? 'text-ui-fg-interactive bg-ui-bg-base' : 'text-ui-fg-subtle')} type="button"><Icons.Italic /></button>
          <div className="w-px h-4 bg-ui-border-base mx-1" />
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={clx("w-8 h-8 flex items-center justify-center rounded-md hover:bg-ui-bg-base", editor.isActive('heading', { level: 1 }) ? 'text-ui-fg-interactive bg-ui-bg-base' : 'text-ui-fg-subtle')} type="button"><Icons.Heading1 /></button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={clx("w-8 h-8 flex items-center justify-center rounded-md hover:bg-ui-bg-base", editor.isActive('heading', { level: 2 }) ? 'text-ui-fg-interactive bg-ui-bg-base' : 'text-ui-fg-subtle')} type="button"><Icons.Heading2 /></button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={clx("w-8 h-8 flex items-center justify-center rounded-md hover:bg-ui-bg-base", editor.isActive('bulletList') ? 'text-ui-fg-interactive bg-ui-bg-base' : 'text-ui-fg-subtle')} type="button"><Icons.List /></button>
        </div>

        <div className="flex-grow flex items-center justify-center">
          <Text size="xsmall" leading="compact" className="text-ui-fg-muted uppercase font-bold tracking-widest opacity-40 select-none">Text Section</Text>
        </div>

        <BlockControls index={index} total={total} onMove={onMove} onRemove={onRemove} />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

// --------------------------------------------------------------------------
// Image Block Component
// --------------------------------------------------------------------------
const ImageBlock = ({
  url,
  index,
  total,
  onMove,
  onRemove
}: {
  url: string;
  index: number;
  total: number;
  onMove: (f: number, t: number) => void;
  onRemove: () => void;
}) => (
  <div className="group relative w-full leading-[0] border-b border-ui-border-base last:border-b-0 overflow-hidden">
    <img src={url} alt="" className="w-full h-auto block" />
    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto bg-ui-bg-base shadow-2xl rounded-lg border border-ui-border-base p-1.5 flex items-center gap-1">
        <BlockControls index={index} total={total} onMove={onMove} onRemove={onRemove} />
      </div>
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm border border-ui-border-base px-3 py-1.5 rounded-full shadow-sm pointer-events-none">
        <Text size="xsmall" weight="plus" className="text-black uppercase tracking-widest flex items-center gap-2">
          <Icons.Image /> Image Block
        </Text>
      </div>
    </div>
  </div>
);

// --------------------------------------------------------------------------
// Divider Add Component (Insert between blocks)
// --------------------------------------------------------------------------
const BlockDivider = ({ onAddText, onAddImage }: { onAddText: () => void, onAddImage: () => void }) => (
  <div className="group relative h-2 -my-1 z-30 flex items-center justify-center">
    <div className="absolute w-full h-px bg-ui-border-interactive/0 group-hover:bg-ui-border-interactive/30 transition-all pointer-events-none" />
    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all transform scale-90 group-hover:scale-100">
      <button
        onClick={onAddText}
        className="flex items-center gap-1.5 bg-ui-bg-interactive text-ui-fg-on-color px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg hover:bg-ui-bg-interactive-hover active:scale-95 transition-all"
      >
        <Icons.Plus /> TEXT
      </button>
      <button
        onClick={onAddImage}
        className="flex items-center gap-1.5 bg-ui-bg-interactive text-ui-fg-on-color px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg hover:bg-ui-bg-interactive-hover active:scale-95 transition-all"
      >
        <Icons.Plus /> IMAGE
      </button>
    </div>
  </div>
);

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------
function ProductDetailWidget({ data }: { data?: AdminProduct }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const insertIndexRef = useRef<number | null>(null);
  const product = data;

  // Sync data and Migrate old structure if needed
  const isLoaded = useRef(false);
  useEffect(() => {
    if (product?.id && !isLoaded.current) {
      const metadata = (product.metadata as any) || {};

      if (metadata.detail_blocks) {
        try {
          const parsed = typeof metadata.detail_blocks === 'string'
            ? JSON.parse(metadata.detail_blocks)
            : metadata.detail_blocks;
          if (Array.isArray(parsed)) setBlocks(parsed);
        } catch (e) {
          console.error("Block parse error", e);
        }
      } else if (metadata.detail_content || metadata.detail_images) {
        const initialBlocks: Block[] = [];
        if (metadata.detail_content) {
          initialBlocks.push({ id: `txt-${Date.now()}`, type: "text", content: metadata.detail_content });
        }
        if (metadata.detail_images) {
          const imgs = typeof metadata.detail_images === 'string' ? JSON.parse(metadata.detail_images) : metadata.detail_images;
          if (Array.isArray(imgs)) {
            imgs.forEach((url, i) => {
              initialBlocks.push({ id: `img-${Date.now()}-${i}`, type: "image", content: url });
            });
          }
        }
        setBlocks(initialBlocks);
      }

      isLoaded.current = true;
      setHasChanges(false);
    }
  }, [product]);

  const recordChange = () => setHasChanges(true);

  const addTextBlock = (atIndex?: number) => {
    const newBlock: Block = { id: `txt-${Date.now()}`, type: "text", content: "" };
    if (typeof atIndex === 'number') {
      const arr = [...blocks];
      arr.splice(atIndex + 1, 0, newBlock);
      setBlocks(arr);
    } else {
      setBlocks(prev => [...prev, newBlock]);
    }
    recordChange();
  };

  const triggerImageUpload = (atIndex?: number) => {
    insertIndexRef.current = typeof atIndex === 'number' ? atIndex : null;
    galleryInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      const res = await fetch('/admin/uploads', { method: 'POST', body: fd, credentials: 'include' });
      const result = await res.json();
      const urls = (result.files || []).map((f: any) => f.url).filter(Boolean);

      const newImgBlocks = urls.map((url: string, i: number) => ({
        id: `img-${Date.now()}-${i}`,
        type: "image",
        content: url
      }));

      if (insertIndexRef.current !== null) {
        const arr = [...blocks];
        arr.splice(insertIndexRef.current + 1, 0, ...newImgBlocks);
        setBlocks(arr);
      } else {
        setBlocks(prev => [...prev, ...newImgBlocks]);
      }
      recordChange();
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
      insertIndexRef.current = null;
    }
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const arr = [...blocks];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setBlocks(arr);
    recordChange();
  };

  const removeBlock = (index: number) => {
    if (window.confirm("Delete this section?")) {
      setBlocks(prev => prev.filter((_, i) => i !== index));
      recordChange();
    }
  };

  const updateTextBlock = (index: number, content: string) => {
    const arr = [...blocks];
    if (arr[index].content !== content) {
      arr[index].content = content;
      setBlocks(arr);
      recordChange();
    }
  };

  const handleSave = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const legacyContent = blocks.filter(b => b.type === 'text').map(b => b.content).join('<br/>');
      const legacyImages = blocks.filter(b => b.type === 'image').map(b => b.content);

      await fetch(`/admin/products/${product.id}/detail-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detail_blocks: blocks,
          detail_content: legacyContent,
          detail_images: legacyImages
        }),
        credentials: 'include'
      });

      setHasChanges(false);
    } catch (err) {
      alert("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <div className="flex flex-col mb-12 px-0 max-w-4xl mx-auto">
      {/* Header Container */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-t-xl px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-2 z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ui-bg-interactive flex items-center justify-center text-ui-fg-on-color">
            <Icons.Grip />
          </div>
          <div>
            <Heading level="h2" className="text-sm font-bold">Presentation Builder</Heading>
            <Text size="xsmall" className="text-ui-fg-muted">Design your product detail page with blocks</Text>
          </div>
          {hasChanges && (
            <StatusBadge color="blue" className="animate-pulse ml-2 font-bold py-0 h-5">MODIFIED</StatusBadge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={() => addTextBlock()} className="h-9 px-4 font-bold">
            <Icons.Plus /> <Icons.Type /> TEXT
          </Button>
          <Button variant="secondary" size="small" onClick={() => triggerImageUpload()} isLoading={uploading} className="h-9 px-4 font-bold">
            <Icons.Plus /> <Icons.Image /> IMAGE
          </Button>
          <div className="w-px h-5 bg-ui-border-base mx-1" />
          <Button
            variant="primary"
            size="small"
            onClick={handleSave}
            disabled={loading || !hasChanges}
            isLoading={loading}
            className="h-9 px-6 font-bold shadow-md active:scale-95 transition-all"
          >
            {loading ? "SAVING..." : "SAVE CHANGES"}
          </Button>
        </div>
      </div>

      {/* Block Canvas Area */}
      <div className="flex flex-col bg-ui-bg-field border-x border-b border-ui-border-base rounded-b-xl overflow-hidden shadow-sm min-h-[400px]">
        {blocks.length > 0 ? (
          <>
            {blocks.map((block, i) => (
              <React.Fragment key={block.id}>
                {block.type === "text" ? (
                  <TextBlock
                    content={block.content}
                    onChange={(val) => updateTextBlock(i, val)}
                    index={i}
                    total={blocks.length}
                    onMove={moveBlock}
                    onRemove={() => removeBlock(i)}
                  />
                ) : (
                  <ImageBlock
                    url={block.content}
                    index={i}
                    total={blocks.length}
                    onMove={moveBlock}
                    onRemove={() => removeBlock(i)}
                  />
                )}
                {i < blocks.length - 1 && (
                  <BlockDivider
                    onAddText={() => addTextBlock(i)}
                    onAddImage={() => triggerImageUpload(i)}
                  />
                )}
              </React.Fragment>
            ))}

            {/* Final Add Spacer */}
            <div className="py-8 flex justify-center border-t border-ui-border-base/50 bg-ui-bg-subtle/20">
              <Button variant="secondary" className="border-dashed border-2 hover:border-ui-border-interactive transition-all opacity-60 hover:opacity-100" onClick={() => addTextBlock()}>
                <Icons.Plus /> END OF PAGE - ADD TEXT
              </Button>
            </div>
          </>
        ) : (
          <div
            className="py-32 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-ui-bg-subtle/40 transition-all group"
            onClick={() => addTextBlock()}
          >
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-ui-border-base flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">
              🎨
            </div>
            <Heading level="h1" className="mb-2">Your canvas is empty</Heading>
            <Text className="text-ui-fg-muted max-w-xs mb-8">
              Start building a premium product experience by adding your first text or image block.
            </Text>
            <div className="flex gap-4">
              <Button variant="secondary" className="px-6 py-5 font-bold border-2"><Icons.Type /> ADD TEXT SECTION</Button>
              <Button variant="secondary" className="px-6 py-5 font-bold border-2" onClick={(e) => { e.stopPropagation(); triggerImageUpload(); }}><Icons.Image /> UPLOAD IMAGES</Button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Picker */}
      <input ref={galleryInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Footer Info */}
      <div className="mt-4 px-4 flex justify-between items-center opacity-50">
        <Text size="xsmall">Blocks will be rendered in the order shown above.</Text>
        <Text size="xsmall">{blocks.length} Block(s) total</Text>
      </div>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductDetailWidget;
