import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ZoomIn, ZoomOut, FileSignature, GripVertical, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

export interface SignaturePosition {
  id: string;
  label: string;
  x: number; // % from left within page (0-100)
  y: number; // % from top within page (0-100)
  page: number; // 1-indexed
  placed: boolean;
}

interface SignaturePlacementStepProps {
  /** Best option: a real PDF (multi-page supported). */
  pdfUrl?: string;
  /** Fallback: HTML preview; page splitting is approximate by A4 height. */
  htmlContent?: string;
  onComplete: (positions: SignaturePosition[]) => void;
  onCancel: () => void;
  signers: { id: string; label: string; name: string }[];
}

function DraggableSignature({
  id,
  label,
  placed,
}: {
  id: string;
  label: string;
  placed: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { source: 'sidebar' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all',
        isDragging && 'opacity-80 shadow-lg',
        placed ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-primary bg-primary/5 hover:bg-primary/10'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <FileSignature className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
      {placed && <Check className="h-4 w-4 text-green-500" />}
    </div>
  );
}

function PlacedSignature({
  position,
  pageHeightPx,
  pageWidthPx,
}: {
  position: SignaturePosition;
  pageHeightPx: number;
  pageWidthPx: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${position.id}`,
    data: { source: 'placed', originalId: position.id },
  });

  const pageOffsetTopPx = (position.page - 1) * pageHeightPx;
  const leftPx = (position.x / 100) * pageWidthPx;
  const topPx = pageOffsetTopPx + (position.y / 100) * pageHeightPx;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: transform ? leftPx + transform.x : leftPx,
    top: transform ? topPx + transform.y : topPx,
    zIndex: isDragging ? 1000 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-2 rounded-lg border-2 border-dashed border-green-500 bg-green-100/90 dark:bg-green-950/90 cursor-grab active:cursor-grabbing transition-shadow',
        isDragging && 'shadow-xl'
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-green-600" />
        <FileSignature className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800 dark:text-green-200">{position.label}</span>
      </div>
      <div className="text-[10px] text-green-600">____________________________</div>
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
  const isPdfMode = Boolean(pdfUrl);

  const [numPages, setNumPages] = useState<number>(isPdfMode ? 0 : 1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { setNodeRef: setDroppableRef } = useDroppable({ id: 'doc-canvas' });

  // Initialize signature positions
  const [positions, setPositions] = useState<SignaturePosition[]>(() =>
    signers.map((s) => ({
      id: s.id,
      label: s.label,
      x: 50,
      y: 80,
      page: 1,
      placed: false,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // HTML mode: estimate number of pages from rendered content height
  useEffect(() => {
    if (isPdfMode) return;
    const el = contentRef.current;
    if (!el) return;

    // Wait a tick to allow layout
    const t = window.setTimeout(() => {
      const pageHeightPx = A4_HEIGHT * scale;
      const h = el.scrollHeight * scale;
      const estimatedPages = Math.max(1, Math.ceil(h / pageHeightPx));
      setNumPages(estimatedPages);
      setLoading(false);
    }, 50);

    return () => window.clearTimeout(t);
  }, [isPdfMode, htmlContent, scale]);

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const clampPercent = (v: number) => Math.max(1, Math.min(99, v));

  const computeFromDrop = useCallback(
    (args: { centerX: number; centerY: number; pageWidthPx: number; pageHeightPx: number }) => {
      const { centerX, centerY, pageWidthPx, pageHeightPx } = args;

      // Convert to page + %
      const page = Math.max(1, Math.floor(centerY / pageHeightPx) + 1);
      const yInPage = centerY - (page - 1) * pageHeightPx;

      const xPct = clampPercent((centerX / pageWidthPx) * 100);
      const yPct = clampPercent((yInPage / pageHeightPx) * 100);

      return { page, xPct, yPct };
    },
    []
  );

  const scrollToPage = useCallback(
    (page: number) => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const pageHeightPx = A4_HEIGHT * scale;
      scroller.scrollTo({ top: (page - 1) * pageHeightPx, behavior: 'smooth' });
    },
    [scale]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!event.over || event.over.id !== 'doc-canvas') return;
      if (!canvasRef.current) return;

      const translated = event.active.rect.current.translated;
      if (!translated) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();

      // center of dragged item relative to canvas
      const centerX = translated.left - canvasRect.left + translated.width / 2;
      const centerY = translated.top - canvasRect.top + translated.height / 2;

      const pageWidthPx = A4_WIDTH * scale;
      const pageHeightPx = A4_HEIGHT * scale;

      const { page, xPct, yPct } = computeFromDrop({ centerX, centerY, pageWidthPx, pageHeightPx });

      const activeId = String(event.active.id);
      const isPlaced = activeId.startsWith('placed-');
      const id = isPlaced ? activeId.replace('placed-', '') : activeId;

      setPositions((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                placed: true,
                page: isPdfMode ? currentPage : page,
                x: xPct,
                y: isPdfMode ? clampPercent((centerY / pageHeightPx) * 100) : yPct,
              }
            : p
        )
      );

      if (!isPdfMode) {
        setCurrentPage(page);
      }
    },
    [computeFromDrop, currentPage, isPdfMode, scale]
  );

  const allPlaced = positions.every((p) => p.placed);
  const placedPositions = positions.filter((p) => p.placed);

  const pageWidthPx = A4_WIDTH * scale;
  const pageHeightPx = A4_HEIGHT * scale;

  // In PDF mode we show a single page at a time; in HTML mode we allow scrolling across pages
  const visiblePlaced = isPdfMode ? placedPositions.filter((p) => p.page === currentPage) : placedPositions;

  return (
    <div className="flex flex-col h-full gap-4">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-[600px]">
          {/* Document Area - 70% */}
          <div className="flex-[7] flex flex-col border rounded-lg overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between p-2 border-b bg-background">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale((s) => Math.max(0.7, Number((s - 0.1).toFixed(2))))}
                  disabled={scale <= 0.7}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale((s) => Math.min(1.6, Number((s + 0.1).toFixed(2))))}
                  disabled={scale >= 1.6}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {numPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      if (!isPdfMode) scrollToPage(Math.max(1, currentPage - 1));
                    }}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">Página {currentPage} de {numPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(numPages, p + 1));
                      if (!isPdfMode) scrollToPage(Math.min(numPages, currentPage + 1));
                    }}
                    disabled={currentPage >= numPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-auto flex items-start justify-center p-4">
              <div
                ref={(node) => {
                  canvasRef.current = node;
                  setDroppableRef(node);
                }}
                className="relative bg-white shadow-lg"
                style={{ width: `${pageWidthPx}px`, minHeight: `${isPdfMode ? pageHeightPx : pageHeightPx * numPages}px` }}
              >
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
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
                    <Page pageNumber={currentPage} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                )}

                {htmlContent && !pdfUrl && (
                  <div ref={contentRef} className="absolute inset-0">
                    {/* page separators */}
                    {Array.from({ length: numPages }).map((_, idx) => (
                      <div
                        key={idx}
                        className="absolute left-0 right-0 border-t border-dashed border-border"
                        style={{ top: `${idx * pageHeightPx}px` }}
                      />
                    ))}
                    <div className="p-8 prose prose-sm max-w-none" style={{ width: `${pageWidthPx}px` }} dangerouslySetInnerHTML={{ __html: htmlContent }} />
                  </div>
                )}

                {/* Signatures overlay */}
                {visiblePlaced.map((p) => (
                  <PlacedSignature key={p.id} position={p} pageHeightPx={pageHeightPx} pageWidthPx={pageWidthPx} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - 30% */}
          <div className="flex-[3] flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Posicionar Assinaturas
                </CardTitle>
                <CardDescription>
                  Arraste cada assinatura para o local desejado. No preview HTML, você pode descer para páginas seguintes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {positions.map((pos) => (
                  <div key={pos.id}>
                    <DraggableSignature id={pos.id} label={pos.label} placed={pos.placed} />
                    {pos.placed && (
                      <p className="text-xs text-muted-foreground mt-1 ml-2">
                        Página {pos.page} • X: {Math.round(pos.x)}% Y: {Math.round(pos.y)}%
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button onClick={() => onComplete(placedPositions)} disabled={!allPlaced} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Confirmar Posições
              </Button>
              <Button variant="outline" onClick={onCancel} className="w-full">
                Voltar
              </Button>
              {!allPlaced && (
                <p className="text-xs text-center text-muted-foreground">Posicione todas as assinaturas para continuar</p>
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}
