import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo, GripVertical, ImageIcon } from 'lucide-react';
import { PlanVariable } from '@/hooks/usePlans';
import { useEffect, useRef, useCallback } from 'react';

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: PlanVariable[];
  readOnly?: boolean;
  includeBuiltInVariables?: boolean;
  includeSignatureMarkers?: boolean;
}

// Helper to format currency fields with extenso placeholder
const formatVariableForInsertion = (variableName: string, fieldType?: string): string => {
  // Signature markers get special formatting
  if (fieldType === 'signature') {
    return `<p style="margin-top: 40px; text-align: center;"><strong>____________________________</strong><br/><strong>{{${variableName}}}</strong></p>`;
  }

  const isCurrencyField =
    fieldType === 'currency' ||
    variableName.toLowerCase().includes('valor') ||
    variableName.toLowerCase().includes('value') ||
    variableName.toLowerCase().includes('preco') ||
    variableName.toLowerCase().includes('price');

  if (isCurrencyField) {
    return `<strong>R$ {{${variableName}}} ({{${variableName}_extenso}})</strong>`;
  }
  return `<strong>{{${variableName}}}</strong>`;
};

export function TemplateEditor({
  content,
  onChange,
  variables,
  readOnly = false,
  includeBuiltInVariables = true,
  includeSignatureMarkers = false,
}: TemplateEditorProps) {
  const draggedVariableRef = useRef<{ name: string; type?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escreva o conteúdo do template aqui. Arraste variáveis da lista à direita para posicioná-las no texto...',
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Underline,
    ],
    content: content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleDragStart = (e: React.DragEvent, variableName: string, fieldType?: string) => {
    draggedVariableRef.current = { name: variableName, type: fieldType };
    e.dataTransfer.setData('text/plain', `{{${variableName}}}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (editor && draggedVariableRef.current) {
      const variableHtml = formatVariableForInsertion(draggedVariableRef.current.name, draggedVariableRef.current.type);
      editor.commands.insertContent(variableHtml, { parseOptions: { preserveWhitespace: false } });
      draggedVariableRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);

      // Reset input
      e.target.value = '';
    },
    [editor]
  );

  if (!editor) {
    return null;
  }

  const builtInVariables = [
    { id: 'builtin_client_name', variable_name: 'client_name', label: 'Nome do cliente', field_type: 'text' },
    { id: 'builtin_start_date', variable_name: 'start_date', label: 'Data de início', field_type: 'date' },
    { id: 'builtin_end_date', variable_name: 'end_date', label: 'Data de término', field_type: 'date' },
    { id: 'builtin_monthly_value', variable_name: 'monthly_value', label: 'Valor mensal', field_type: 'currency' },
    { id: 'builtin_total_value', variable_name: 'total_value', label: 'Valor total', field_type: 'currency' },
  ] as const;

  const signatureMarkers = [
    { id: 'sig_company', variable_name: 'ASSINATURA_EMPRESA', label: 'Assinatura da Empresa', field_type: 'signature' },
    { id: 'sig_client', variable_name: 'ASSINATURA_CLIENTE', label: 'Assinatura do Cliente', field_type: 'signature' },
  ] as const;

  return (
    <div className="flex gap-4 h-[500px]">
      {/* Hidden file input for images */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Editor Area */}
      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
        {/* Toolbar */}
        {!readOnly && (
          <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-accent' : ''}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-accent' : ''}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'bg-accent' : ''}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button type="button" variant="ghost" size="sm" onClick={handleImageUpload} title="Inserir imagem">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 overflow-auto p-4" onDrop={handleDrop} onDragOver={handleDragOver}>
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-4"
          />
        </div>
      </div>

      {/* Variables Panel */}
      {!readOnly && (variables.length > 0 || includeBuiltInVariables || includeSignatureMarkers) && (
        <div className="w-64 border rounded-lg p-4 bg-muted/30 overflow-auto">
          <h4 className="font-medium mb-3 text-sm">Variáveis Disponíveis</h4>
          <p className="text-xs text-muted-foreground mb-3">Arraste as variáveis para o editor para posicioná-las no template</p>

          {includeBuiltInVariables && (
            <div className="mb-4">
              <p className="text-xs font-medium mb-2">Campos padrão do contrato</p>
              <div className="space-y-2">
                {builtInVariables.map((variable) => (
                  <div
                    key={variable.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, variable.variable_name, variable.field_type)}
                    className="flex items-center gap-2 p-2 border rounded bg-background cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <code className="text-xs bg-muted px-1 rounded block truncate font-bold">{`{{${variable.variable_name}}}`}</code>
                      <span className="text-xs text-muted-foreground">{variable.label}</span>
                      {variable.field_type === 'currency' && (
                        <span className="text-[10px] text-primary block">R$ XX.XXX,XX (por extenso)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {variables.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium mb-2">Campos do plano</p>
              <div className="space-y-2">
                {variables.map((variable) => {
                  const isCurrency =
                    variable.field_type === 'currency' ||
                    variable.variable_name.toLowerCase().includes('valor') ||
                    variable.variable_name.toLowerCase().includes('value');

                  return (
                    <div
                      key={variable.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, variable.variable_name, variable.field_type)}
                      className="flex items-center gap-2 p-2 border rounded bg-background cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <code className="text-xs bg-muted px-1 rounded block truncate font-bold">{`{{${variable.variable_name}}}`}</code>
                        <span className="text-xs text-muted-foreground">{variable.label}</span>
                        {isCurrency && <span className="text-[10px] text-primary block">R$ XX.XXX,XX (por extenso)</span>}
                      </div>
                      {variable.required && (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          *
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {includeSignatureMarkers && (
            <div>
              <p className="text-xs font-medium mb-2 text-green-600">Marcadores de Assinatura</p>
              <div className="space-y-2">
                {signatureMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, marker.variable_name, marker.field_type)}
                    className="flex items-center gap-2 p-2 border border-green-300 rounded bg-green-50 dark:bg-green-950/30 cursor-grab active:cursor-grabbing hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
                  >
                    <GripVertical className="h-3 w-3 text-green-600" />
                    <div className="flex-1 min-w-0">
                      <code className="text-xs bg-green-200 dark:bg-green-900 px-1 rounded block truncate font-bold text-green-800 dark:text-green-200">{`{{${marker.variable_name}}}`}</code>
                      <span className="text-xs text-green-700 dark:text-green-300">{marker.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Arraste para definir onde as assinaturas aparecerão no documento
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
