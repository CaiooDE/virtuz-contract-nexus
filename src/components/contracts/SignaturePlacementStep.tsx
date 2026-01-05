import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileSignature, Check, MousePointer, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// MUST match the styling used when we send the document to Autentique
const DOC_MARGIN_PX = 40;
const DOC_FONT_FAMILY = 'Arial, sans-serif';
const DOC_LINE_HEIGHT = 1.6;

export interface SignaturePosition {
  id: string;
  label: string;
  x: number; // % from left (0-100)
  y: number; // % from top within the page (0-100)
  page: number; // 1-indexed
  placed: boolean;
}

interface SignaturePlacementStepProps {
  htmlContent?: string;
  onComplete: (positions: SignaturePosition[]) => void;
  onCancel: () => void;
  signers: { id: string; label: string; name: string }[];
}

export function SignaturePlacementStep({
  htmlContent,
  onComplete,
  onCancel,
  signers,
}: SignaturePlacementStepProps) {
  const [scale, setScale] = useState<number>(0.8);
  const [selectedSignerId, setSelectedSignerId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Estimate number of pages based on content height
  const [numPages, setNumPages] = useState(1);

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

  const pageWidthPx = A4_WIDTH * scale;
  const pageHeightPx = A4_HEIGHT * scale;

  // Estimate pages from content height
  useEffect(() => {
    if (!contentRef.current) return;
    const timer = setTimeout(() => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        const estimated = Math.max(1, Math.ceil(contentHeight / pageHeightPx));
        setNumPages(estimated);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [htmlContent, scale, pageHeightPx]);

  const totalHeightPx = pageHeightPx * numPages;

  // Handle click on the document canvas
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedSignerId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top + canvasRef.current.scrollTop;

      // Calculate page and position
      const page = Math.max(1, Math.ceil(clickY / pageHeightPx));
      const yInPage = clickY - (page - 1) * pageHeightPx;

      // x/y are sent as % of the page (Autentique uses page-relative percentages).
      const xPct = Math.max(1, Math.min(99, (clickX / pageWidthPx) * 100));
      const yPct = Math.max(1, Math.min(99, (yInPage / pageHeightPx) * 100));

      setPositions((prev) =>
        prev.map((p) =>
          p.id === selectedSignerId ? { ...p, x: xPct, y: yPct, page, placed: true } : p
        )
      );

      // Clear selection after placing
      setSelectedSignerId(null);
    },
    [selectedSignerId, pageWidthPx, pageHeightPx]
  );

  // Handle clicking on a placed signature to reposition it
  const handlePlacedSignatureClick = (e: React.MouseEvent, signerId: string) => {
    e.stopPropagation();
    setSelectedSignerId(signerId);
  };

  const allPlaced = positions.every((p) => p.placed);
  const placedPositions = positions.filter((p) => p.placed);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-4 h-[650px]">
        {/* Document Area - 70% */}
        <div className="flex-[7] flex flex-col border rounded-lg overflow-hidden bg-muted/30">
          {/* Controls */}
          <div className="flex items-center justify-between p-2 border-b bg-background">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale((s) => Math.min(1.2, Number((s + 0.1).toFixed(2))))}
                disabled={scale >= 1.2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {numPages > 1 && (
              <span className="text-sm text-muted-foreground">
                {numPages} página{numPages > 1 ? 's' : ''}
              </span>
            )}

            {selectedSignerId && (
              <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                <MousePointer className="h-4 w-4" />
                Clique no documento para posicionar
              </div>
            )}
          </div>

          {/* Scrollable canvas */}
          <div
            ref={canvasRef}
            className={cn(
              'flex-1 overflow-auto flex justify-center p-4 bg-muted/50',
              selectedSignerId && 'cursor-crosshair'
            )}
            onClick={handleCanvasClick}
          >
            <div
              className="relative bg-background shadow-lg"
              style={{
                width: `${pageWidthPx}px`,
                minHeight: `${totalHeightPx}px`,
              }}
            >
              {/* Page separators */}
              {Array.from({ length: numPages }).map((_, idx) => (
                <div
                  key={`page-sep-${idx}`}
                  className="absolute left-0 right-0 border-t-2 border-dashed border-muted-foreground/30 pointer-events-none"
                  style={{ top: `${idx * pageHeightPx}px` }}
                >
                  {idx > 0 && (
                    <span className="absolute -top-3 left-2 text-[10px] bg-background px-1 text-muted-foreground">
                      Página {idx + 1}
                    </span>
                  )}
                </div>
              ))}

              {/* HTML Content (match Autentique wrapper styles) */}
              <div
                ref={contentRef}
                style={{
                  width: `${pageWidthPx}px`,
                  padding: `${DOC_MARGIN_PX}px`,
                  fontFamily: DOC_FONT_FAMILY,
                  lineHeight: DOC_LINE_HEIGHT,
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent || '' }}
              />

              {/* Placed signatures */}
              {placedPositions.map((pos) => {
                const topPx = (pos.page - 1) * pageHeightPx + (pos.y / 100) * pageHeightPx;
                const leftPx = (pos.x / 100) * pageWidthPx;

                return (
                  <div
                    key={pos.id}
                    className={cn(
                      'absolute flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer',
                      selectedSignerId === pos.id
                        ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/50'
                        : 'border-border bg-background/80 hover:shadow-md'
                    )}
                    style={{
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: selectedSignerId === pos.id ? 100 : 10,
                    }}
                    onClick={(e) => handlePlacedSignatureClick(e, pos.id)}
                  >
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-foreground" />
                      <span className="text-xs font-medium text-foreground whitespace-nowrap">{pos.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">____________________</div>
                  </div>
                );
              })}
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
                Clique em uma assinatura abaixo, depois clique no documento para posicioná-la
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  onClick={() => setSelectedSignerId(pos.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    selectedSignerId === pos.id
                      ? 'border-primary bg-primary/10 shadow-md'
                      : pos.placed
                        ? 'border-border bg-muted/40 hover:bg-muted/60'
                        : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <FileSignature
                    className={cn('h-5 w-5', pos.placed ? 'text-foreground' : 'text-muted-foreground')}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{pos.label}</span>
                    {pos.placed && (
                      <p className="text-xs text-muted-foreground">
                        Página {pos.page} • X: {Math.round(pos.x)}% Y: {Math.round(pos.y)}%
                      </p>
                    )}
                  </div>
                  {pos.placed && <Check className="h-5 w-5 text-primary" />}
                  {selectedSignerId === pos.id && <MousePointer className="h-4 w-4 text-primary animate-bounce" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Clique em uma assinatura na lista acima</p>
              <p>2. Clique no local desejado no documento</p>
              <p>3. Para mover, clique na assinatura posicionada e depois no novo local</p>
              <p>4. Role o documento para acessar outras páginas</p>
              <p>5. Confirme quando todas estiverem posicionadas</p>
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
    </div>
  );
}

