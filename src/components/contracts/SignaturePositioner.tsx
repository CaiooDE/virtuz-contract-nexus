import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Building2, User, ZoomIn, ZoomOut } from "lucide-react";

interface SignaturePosition {
  x: number;
  y: number;
}

interface SignaturePositions {
  company: SignaturePosition;
  client: SignaturePosition;
}

interface SignaturePositionerProps {
  templateContent: string;
  positions: SignaturePositions;
  onPositionsChange: (positions: SignaturePositions) => void;
}

export function SignaturePositioner({
  templateContent,
  positions,
  onPositionsChange,
}: SignaturePositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"company" | "client" | null>(null);
  const [scale, setScale] = useState(0.6);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure actual content height
  useEffect(() => {
    if (contentRef.current) {
      // Wait for render to complete
      const timer = setTimeout(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [templateContent, scale]);

  const handleMouseDown = useCallback(
    (type: "company" | "client") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !contentRef.current) return;

      const rect = contentRef.current.getBoundingClientRect();
      const contentHeight = contentRef.current.scrollHeight;
      const contentWidth = contentRef.current.scrollWidth;
      
      // Get scroll position of the container
      const scrollTop = containerRef.current?.scrollTop || 0;
      
      // Calculate position relative to the FULL content (not just visible area)
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top + scrollTop;
      
      const x = (relativeX / contentWidth) * 100;
      const y = (relativeY / contentHeight) * 100;

      // Clamp values between 0 and 100
      const clampedX = Math.max(2, Math.min(98, x));
      const clampedY = Math.max(2, Math.min(98, y));

      onPositionsChange({
        ...positions,
        [dragging]: { x: clampedX, y: clampedY },
      });
    },
    [dragging, positions, onPositionsChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleTouchStart = useCallback(
    (type: "company" | "client") => (e: React.TouchEvent) => {
      e.stopPropagation();
      setDragging(type);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || !contentRef.current) return;

      const rect = contentRef.current.getBoundingClientRect();
      const contentHeight = contentRef.current.scrollHeight;
      const contentWidth = contentRef.current.scrollWidth;
      const touch = e.touches[0];
      
      const scrollTop = containerRef.current?.scrollTop || 0;
      
      const relativeX = touch.clientX - rect.left;
      const relativeY = touch.clientY - rect.top + scrollTop;
      
      const x = (relativeX / contentWidth) * 100;
      const y = (relativeY / contentHeight) * 100;

      const clampedX = Math.max(2, Math.min(98, x));
      const clampedY = Math.max(2, Math.min(98, y));

      onPositionsChange({
        ...positions,
        [dragging]: { x: clampedX, y: clampedY },
      });
    },
    [dragging, positions, onPositionsChange]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(null);
  }, []);

  // Scroll to show signature when it's outside visible area
  const scrollToSignature = (type: "company" | "client") => {
    if (!containerRef.current || !contentRef.current) return;
    
    const pos = positions[type];
    const contentHeight = contentRef.current.scrollHeight;
    const targetY = (pos.y / 100) * contentHeight;
    
    containerRef.current.scrollTo({
      top: Math.max(0, targetY - 200),
      behavior: "smooth"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GripVertical className="h-5 w-5" />
          Posicionar Assinaturas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Role o documento e arraste os marcadores para definir onde cada assinatura aparecerá
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => scrollToSignature("company")}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span>Empresa ({positions.company.y.toFixed(0)}%)</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSignature("client")}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Cliente ({positions.client.y.toFixed(0)}%)</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setScale(s => Math.max(0.4, s - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setScale(s => Math.min(1, s + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="border rounded-lg bg-muted/30 overflow-auto"
          style={{ height: "500px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Content wrapper with relative positioning for markers */}
          <div 
            ref={contentRef}
            className="relative bg-white min-h-full"
            style={{ cursor: dragging ? "grabbing" : "default" }}
          >
            {/* Document Content */}
            <div
              className="p-8 text-sm leading-relaxed prose prose-sm max-w-none"
              style={{ 
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: `${100 / scale}%`,
              }}
              dangerouslySetInnerHTML={{ __html: templateContent }}
            />

            {/* Company Signature Marker */}
            <div
              className={`absolute cursor-grab select-none transition-shadow ${
                dragging === "company" ? "shadow-lg ring-2 ring-blue-400 cursor-grabbing z-20" : "shadow-md hover:shadow-lg z-10"
              }`}
              style={{
                left: `${positions.company.x}%`,
                top: `${positions.company.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={handleMouseDown("company")}
              onTouchStart={handleTouchStart("company")}
            >
              <div className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap shadow-lg">
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium">Empresa</span>
              </div>
              <div className="absolute left-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-500 transform -translate-x-1/2" />
            </div>

            {/* Client Signature Marker */}
            <div
              className={`absolute cursor-grab select-none transition-shadow ${
                dragging === "client" ? "shadow-lg ring-2 ring-green-400 cursor-grabbing z-20" : "shadow-md hover:shadow-lg z-10"
              }`}
              style={{
                left: `${positions.client.x}%`,
                top: `${positions.client.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={handleMouseDown("client")}
              onTouchStart={handleTouchStart("client")}
            >
              <div className="bg-green-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap shadow-lg">
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">Cliente</span>
              </div>
              <div className="absolute left-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-500 transform -translate-x-1/2" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onPositionsChange({
                company: { x: 25, y: 95 },
                client: { x: 75, y: 95 },
              });
              setTimeout(() => scrollToSignature("company"), 100);
            }}
          >
            Lado a Lado (Final)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onPositionsChange({
                company: { x: 50, y: 90 },
                client: { x: 50, y: 97 },
              });
              setTimeout(() => scrollToSignature("company"), 100);
            }}
          >
            Empilhadas (Final)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
              }
            }}
          >
            Ir para Final
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Role para ver todo o documento. Clique no nome da assinatura para ir até ela. As posições são em % do documento total.
        </p>
      </CardContent>
    </Card>
  );
}
