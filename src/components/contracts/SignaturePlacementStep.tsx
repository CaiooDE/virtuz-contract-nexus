import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDraggable, DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ZoomIn, ZoomOut, FileSignature, GripVertical, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface SignaturePosition {
  id: string;
  label: string;
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  page: number;
  placed: boolean;
}

interface SignaturePlacementStepProps {
  pdfUrl?: string;
  htmlContent?: string;
  onComplete: (positions: SignaturePosition[]) => void;
  onCancel: () => void;
  signers: { id: string; label: string; name: string }[];
}

// Draggable signature badge component
function DraggableSignature({ 
  id, 
  label, 
  placed, 
  isOnCanvas 
}: { 
  id: string; 
  label: string; 
  placed: boolean;
  isOnCanvas?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { label }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all",
        isDragging && "opacity-80 shadow-lg",
        placed && !isOnCanvas && "border-green-500 bg-green-50 dark:bg-green-950/30",
        !placed && "border-primary bg-primary/5 hover:bg-primary/10",
        isOnCanvas && "border-dashed border-primary bg-background shadow-md"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <FileSignature className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
      {placed && !isOnCanvas && <Check className="h-4 w-4 text-green-500" />}
    </div>
  );
}

// Placed signature on the PDF
function PlacedSignature({ 
  position, 
  containerWidth,
  containerHeight,
}: { 
  position: SignaturePosition;
  containerWidth: number;
  containerHeight: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${position.id}`,
    data: { 
      label: position.label,
      isPlaced: true,
      originalPosition: position
    }
  });

  const left = (position.x / 100) * containerWidth;
  const top = (position.y / 100) * containerHeight;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: transform ? left + transform.x : left,
    top: transform ? top + transform.y : top,
    zIndex: isDragging ? 1000 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-2 rounded-lg border-2 border-dashed border-green-500 bg-green-100/90 dark:bg-green-950/90 cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && "shadow-xl"
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-green-600" />
        <FileSignature className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800 dark:text-green-200">{position.label}</span>
      </div>
      <div className="text-[10px] text-green-600">
        ____________________________
      </div>
    </div>
  );
}

export function SignaturePlacementStep({
  pdfUrl,
  htmlContent,
  onComplete,
  onCancel,
  signers,
}: SignaturePlacementStepProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Initialize signature positions
  const [positions, setPositions] = useState<SignaturePosition[]>(() =>
    signers.map(signer => ({
      id: signer.id,
      label: signer.label,
      x: 50, // center
      y: 80, // near bottom
      page: 1,
      placed: false,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Convert HTML to PDF blob for preview
  useEffect(() => {
    if (htmlContent && !pdfUrl) {
      // Create a blob URL from HTML for display
      // In production, this would use a proper HTML to PDF conversion
      const htmlBlob = new Blob([`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1, h2, h3 { color: #333; }
            p { margin-bottom: 10px; }
          </style>
        </head>
        <body>${htmlContent}</body>
        </html>
      `], { type: 'text/html' });
      setPdfBlobUrl(URL.createObjectURL(htmlBlob));
      setLoading(false);
    }
  }, [htmlContent, pdfUrl]);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta, over } = event;
    
    if (!containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const activeId = String(active.id);
    
    // Check if dragging a placed signature
    if (activeId.startsWith('placed-')) {
      const originalId = activeId.replace('placed-', '');
      
      setPositions(prev => prev.map(pos => {
        if (pos.id === originalId) {
          const currentLeft = (pos.x / 100) * container.width;
          const currentTop = (pos.y / 100) * container.height;
          
          const newLeft = currentLeft + delta.x;
          const newTop = currentTop + delta.y;
          
          // Convert back to percentage
          const newX = Math.max(5, Math.min(95, (newLeft / container.width) * 100));
          const newY = Math.max(5, Math.min(95, (newTop / container.height) * 100));
          
          return { ...pos, x: newX, y: newY };
        }
        return pos;
      }));
    } else {
      // New signature being placed
      // Check if dropped on the PDF container
      const dropX = delta.x;
      const dropY = delta.y;
      
      // Get the position relative to container
      if (containerRef.current) {
        const dragElement = document.querySelector(`[data-rbd-drag-handle-draggable-id="${activeId}"]`);
        
        // Calculate position as percentage
        setPositions(prev => prev.map(pos => {
          if (pos.id === activeId && !pos.placed) {
            // Use center of container as fallback
            const centerX = 50;
            const centerY = 70;
            
            return { 
              ...pos, 
              x: centerX, 
              y: centerY, 
              page: currentPage,
              placed: true 
            };
          }
          return pos;
        }));
      }
    }
  }, [currentPage]);

  const handleDropOnPdf = useCallback((e: React.DragEvent<HTMLDivElement>, signatureId: string) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    setPositions(prev => prev.map(pos => {
      if (pos.id === signatureId) {
        return { 
          ...pos, 
          x: Math.max(5, Math.min(95, x)), 
          y: Math.max(5, Math.min(95, y)), 
          page: currentPage,
          placed: true 
        };
      }
      return pos;
    }));
  }, [currentPage]);

  const handleComplete = () => {
    // Filter only placed signatures
    const placedPositions = positions.filter(p => p.placed);
    onComplete(placedPositions);
  };

  const allPlaced = positions.every(p => p.placed);
  const currentPagePositions = positions.filter(p => p.page === currentPage && p.placed);

  return (
    <div className="flex flex-col h-full gap-4">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-[600px]">
          {/* PDF Preview Area - 70% */}
          <div className="flex-[7] flex flex-col border rounded-lg overflow-hidden bg-muted/30">
            {/* PDF Controls */}
            <div className="flex items-center justify-between p-2 border-b bg-background">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(s => Math.min(2, s + 0.1))}
                  disabled={scale >= 2}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              
              {numPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    disabled={currentPage >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* PDF Content */}
            <div 
              className="flex-1 overflow-auto flex items-start justify-center p-4"
            >
              <div 
                ref={containerRef}
                className="relative bg-white shadow-lg"
                style={{ 
                  width: `${595 * scale}px`, 
                  minHeight: `${842 * scale}px`,
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const signatureId = e.dataTransfer.getData('signatureId');
                  if (signatureId) {
                    handleDropOnPdf(e, signatureId);
                  }
                }}
              >
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                {/* Render HTML content or PDF */}
                {htmlContent && !pdfUrl && (
                  <div 
                    className="p-8 prose prose-sm max-w-none"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                )}

                {pdfUrl && (
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    loading={
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                )}

                {/* Placed signatures overlay */}
                {currentPagePositions.map(position => (
                  <PlacedSignature
                    key={position.id}
                    position={position}
                    containerWidth={595 * scale}
                    containerHeight={842 * scale}
                  />
                ))}

                {/* Drop zone overlay when dragging */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-transparent hover:border-primary/50 transition-colors" />
              </div>
            </div>
          </div>

          {/* Signers Panel - 30% */}
          <div className="flex-[3] flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Posicionar Assinaturas
                </CardTitle>
                <CardDescription>
                  Arraste cada assinatura para o local desejado no documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {positions.map(pos => (
                  <div
                    key={pos.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('signatureId', pos.id);
                    }}
                  >
                    <DraggableSignature
                      id={pos.id}
                      label={pos.label}
                      placed={pos.placed}
                    />
                    {pos.placed && (
                      <p className="text-xs text-muted-foreground mt-1 ml-2">
                        Página {pos.page} • X: {Math.round(pos.x)}% Y: {Math.round(pos.y)}%
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Instruções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Arraste cada marcador de assinatura para o documento</p>
                <p>2. Posicione no local exato onde a assinatura deve aparecer</p>
                <p>3. Use as setas para navegar entre páginas</p>
                <p>4. Ajuste o zoom se necessário</p>
                <p>5. Clique em "Confirmar Posições" quando terminar</p>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleComplete}
                disabled={!allPlaced}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar Posições
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full"
              >
                Voltar
              </Button>
              
              {!allPlaced && (
                <p className="text-xs text-center text-muted-foreground">
                  Posicione todas as assinaturas para continuar
                </p>
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
