import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bold, Italic, List, ListOrdered, Undo, Redo, GripVertical } from 'lucide-react';
import { PlanVariable } from '@/hooks/usePlans';
import { useEffect, useRef } from 'react';

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: PlanVariable[];
  readOnly?: boolean;
}

// Helper to format currency fields with extenso placeholder
const formatVariableForInsertion = (variableName: string, fieldType?: string): string => {
  const isCurrencyField = fieldType === 'currency' || 
    variableName.toLowerCase().includes('valor') || 
    variableName.toLowerCase().includes('value') ||
    variableName.toLowerCase().includes('preco') ||
    variableName.toLowerCase().includes('price');
  
  if (isCurrencyField) {
    return `<strong>R$ {{${variableName}}} ({{${variableName}_extenso}})</strong>`;
  }
  return `<strong>{{${variableName}}}</strong>`;
};

export function TemplateEditor({ content, onChange, variables, readOnly = false }: TemplateEditorProps) {
  const draggedVariableRef = useRef<{ name: string; type?: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escreva o conteúdo do template aqui. Arraste variáveis da lista à direita para posicioná-las no texto...',
      }),
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
      const variableHtml = formatVariableForInsertion(
        draggedVariableRef.current.name, 
        draggedVariableRef.current.type
      );
      editor.commands.insertContent(variableHtml, { parseOptions: { preserveWhitespace: false } });
      draggedVariableRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex gap-4 h-[500px]">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Editor Content */}
        <div
          className="flex-1 overflow-auto p-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
          />
        </div>
      </div>

      {/* Variables Panel */}
      {!readOnly && variables.length > 0 && (
        <div className="w-64 border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium mb-3 text-sm">Variáveis Disponíveis</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Arraste as variáveis para o editor para posicioná-las no template
          </p>
          <div className="space-y-2">
            {variables.map((variable) => {
              const isCurrency = variable.field_type === 'currency' || 
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
                    <code className="text-xs bg-muted px-1 rounded block truncate font-bold">
                      {`{{${variable.variable_name}}}`}
                    </code>
                    <span className="text-xs text-muted-foreground">{variable.label}</span>
                    {isCurrency && (
                      <span className="text-[10px] text-primary block">
                        R$ XX.XXX,XX (por extenso)
                      </span>
                    )}
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
    </div>
  );
}
