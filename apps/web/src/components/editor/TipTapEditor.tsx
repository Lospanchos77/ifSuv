import { ActionIcon, Box, Divider, Group, Tooltip } from '@mantine/core';
import {
  IconBold,
  IconCode,
  IconH2,
  IconH3,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
  IconPhoto,
  IconQuote,
  IconStrikethrough,
} from '@tabler/icons-react';
import { TICKET_PHOTO_MIME_TYPES } from '@ifsuv/shared';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { swalError, swalPrompt } from '../../lib/swal';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  /** Si fourni, active le bouton image (upload → renvoie l'URL à insérer). */
  onImageUpload?: (file: File) => Promise<string>;
}

export function TipTapEditor({
  value,
  onChange,
  placeholder = 'Saisir le diagnostic…',
  editable = true,
  onImageUpload,
}: Props): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // Tiptap renvoie "<p></p>" pour un éditeur vide. On normalise en string vide.
      onChange(ed.isEmpty ? '' : html);
    },
  });

  // Synchronise le contenu si la prop value change (ex: reset du form)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value && (value || !editor.isEmpty)) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return <Box style={{ minHeight: 160 }} />;
  }

  return (
    <Box
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
      }}
    >
      {editable && <Toolbar editor={editor} onImageUpload={onImageUpload} />}
      <Box
        style={{
          padding: '12px 16px',
          minHeight: 200,
        }}
      >
        <EditorContent editor={editor} className="ifsuv-tiptap" />
      </Box>
    </Box>
  );
}

function Toolbar({
  editor,
  onImageUpload,
}: {
  editor: Editor;
  onImageUpload?: (file: File) => Promise<string>;
}): JSX.Element {
  function handleAddImage(): void {
    if (!onImageUpload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = TICKET_PHOTO_MIME_TYPES.join(',');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void onImageUpload(file)
        .then((url) => {
          editor.chain().focus().setImage({ src: url }).run();
        })
        .catch((err: unknown) => {
          swalError('Image refusée', err instanceof Error ? err.message : 'Erreur inconnue');
        });
    };
    input.click();
  }

  async function handleSetLink(): Promise<void> {
    const previousUrl = editor.getAttributes('link')['href'] as string | undefined;
    const url = await swalPrompt({
      title: 'Insérer un lien',
      text: 'Laissez vide pour retirer le lien',
      inputType: 'url',
      placeholder: 'https://exemple.com',
      initialValue: previousUrl ?? 'https://',
      confirmText: 'Valider',
    });
    if (url === null) return; // annulé
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <Group
      gap={4}
      p="xs"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        flexWrap: 'wrap',
      }}
    >
      <ToolbarButton
        label="Gras"
        icon={<IconBold size={16} />}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italique"
        icon={<IconItalic size={16} />}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Barré"
        icon={<IconStrikethrough size={16} />}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <Divider orientation="vertical" />
      <ToolbarButton
        label="Titre 2"
        icon={<IconH2 size={16} />}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Titre 3"
        icon={<IconH3 size={16} />}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <Divider orientation="vertical" />
      <ToolbarButton
        label="Liste"
        icon={<IconList size={16} />}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Liste numérotée"
        icon={<IconListNumbers size={16} />}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="Citation"
        icon={<IconQuote size={16} />}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        label="Code"
        icon={<IconCode size={16} />}
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <Divider orientation="vertical" />
      <ToolbarButton
        label="Lien"
        icon={<IconLink size={16} />}
        active={editor.isActive('link')}
        onClick={handleSetLink}
      />
      {onImageUpload && (
        <ToolbarButton
          label="Insérer une image"
          icon={<IconPhoto size={16} />}
          onClick={handleAddImage}
        />
      )}
    </Group>
  );
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: ToolbarButtonProps): JSX.Element {
  return (
    <Tooltip label={label}>
      <ActionIcon
        variant={active ? 'filled' : 'subtle'}
        onClick={onClick}
        disabled={disabled}
        size="sm"
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}
