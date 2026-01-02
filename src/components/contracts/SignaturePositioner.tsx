import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Building2, User, ZoomIn, ZoomOut, ArrowDown } from "lucide-react";

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
  const [scale, setScale] = useState(0.5);

  const getPositionFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!contentRef.current || !containerRef.current) return null;

    const contentRect = contentRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const scrollLeft = containerRef.current.scrollLeft;
    
    // Position relative to the content div (accounting for scroll)
    const relativeX = clientX - contentRect.left + scrollLeft;
    const relativeY = clientY - contentRect.top + scrollTop;
    
    // Convert to percentage of actual content size
    const contentWidth = contentRef.current.scrollWidth;
    const contentHeight = contentRef.current.scrollHeight;
    
    const x = (relativeX / contentWidth) * 100;
    const y = (relativeY / contentHeight) * 100;

    // No clamping - completely free positioning
    return { x, y };
  }, []);

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
      if (!dragging) return;
      
      const pos = getPositionFromEvent(e.clientX, e.clientY);
      if (!pos) return;

      onPositionsChange({
        ...positions,
        [dragging]: pos,
      });
    },
    [dragging, positions, onPositionsChange, getPositionFromEvent]
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
      if (!dragging) return;
      
      const touch = e.touches[0];
      const pos = getPositionFromEvent(touch.clientX, touch.clientY);
      if (!pos) return;

      onPositionsChange({
        ...positions,
        [dragging]: pos,
      });
    },
    [dragging, positions, onPositionsChange, getPositionFromEvent]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(null);
  }, []);

  const scrollToEnd = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ 
        top: containerRef.current.scrollHeight, 
        behavior: "smooth" 
      });
    }
  };

  const scrollToPosition = (y: number) => {
    if (!containerRef.current || !contentRef.current) return;
    const contentHeight = contentRef.current.scrollHeight;
    const targetY = (y / 100) * contentHeight;
    containerRef.current.scrollTo({
      top: Math.max(0, targetY - 250),
      behavior: "smooth"
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GripVertical className="h-5 w-5" />
          Posicionar Assinaturas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Arraste livremente os marcadores para qualquer posição do documento
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => scrollToPosition(positions.company.y)}
              className="flex items-center gap-1.5 text-sm px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-sm" />
              <span>Empresa</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToPosition(positions.client.y)}
              className="flex items-center gap-1.5 text-sm px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
              <span>Cliente</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setScale(s => Math.min(1.2, s + 0.1))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={scrollToEnd}
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Final
            </Button>
          </div>
        </div>

        {/* Document viewer */}
        <div 
          ref={containerRef}
          className="border rounded-lg overflow-auto bg-neutral-100"
          style={{ height: "550px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            ref={contentRef}
            className="relative bg-white shadow-sm mx-auto"
            style={{ 
              width: `${100 / scale}%`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              cursor: dragging ? "grabbing" : "default",
            }}
          >
            {/* Document Content */}
            <div
              className="p-8 text-sm leading-relaxed prose prose-sm max-w-none min-h-[800px]"
              dangerouslySetInnerHTML={{ __html: templateContent }}
            />

            {/* Company Signature Marker */}
            <div
              className={`absolute select-none ${
                dragging === "company" 
                  ? "cursor-grabbing z-50 scale-110" 
                  : "cursor-grab z-40 hover:scale-105"
              } transition-transform`}
              style={{
                left: `${positions.company.x}%`,
                top: `${positions.company.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={handleMouseDown("company")}
              onTouchStart={handleTouchStart("company")}
            >
              <div className={`bg-blue-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
                dragging === "company" ? "ring-2 ring-blue-300 ring-offset-2" : ""
              }`}>
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Assinatura Empresa</span>
              </div>
            </div>

            {/* Client Signature Marker */}
            <div
              className={`absolute select-none ${
                dragging === "client" 
                  ? "cursor-grabbing z-50 scale-110" 
                  : "cursor-grab z-40 hover:scale-105"
              } transition-transform`}
              style={{
                left: `${positions.client.x}%`,
                top: `${positions.client.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={handleMouseDown("client")}
              onTouchStart={handleTouchStart("client")}
            >
              <div className={`bg-green-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
                dragging === "client" ? "ring-2 ring-green-300 ring-offset-2" : ""
              }`}>
                <User className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Assinatura Cliente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Position info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex gap-4">
            <span>
              <span className="text-blue-500 font-medium">Empresa:</span> X:{positions.company.x.toFixed(1)}% Y:{positions.company.y.toFixed(1)}%
            </span>
            <span>
              <span className="text-green-500 font-medium">Cliente:</span> X:{positions.client.x.toFixed(1)}% Y:{positions.client.y.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
