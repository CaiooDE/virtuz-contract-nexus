import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Building2, User } from "lucide-react";

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
  const [dragging, setDragging] = useState<"company" | "client" | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [templateContent]);

  const handleMouseDown = useCallback(
    (type: "company" | "client") => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(type);
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRect) return;

      const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;

      // Clamp values between 0 and 100
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      onPositionsChange({
        ...positions,
        [dragging]: { x: clampedX, y: clampedY },
      });
    },
    [dragging, containerRect, positions, onPositionsChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleTouchStart = useCallback(
    (type: "company" | "client") => (e: React.TouchEvent) => {
      e.preventDefault();
      setDragging(type);
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || !containerRect) return;

      const touch = e.touches[0];
      const x = ((touch.clientX - containerRect.left) / containerRect.width) * 100;
      const y = ((touch.clientY - containerRect.top) / containerRect.height) * 100;

      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      onPositionsChange({
        ...positions,
        [dragging]: { x: clampedX, y: clampedY },
      });
    },
    [dragging, containerRect, positions, onPositionsChange]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GripVertical className="h-5 w-5" />
          Posicionar Assinaturas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Arraste os marcadores para definir onde cada assinatura aparecerá no documento
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>Empresa (Virtuz Mídia)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Cliente</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative border rounded-lg bg-white overflow-hidden select-none"
          style={{ minHeight: "500px", maxHeight: "700px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Document Preview */}
          <div
            className="p-8 text-sm leading-relaxed prose prose-sm max-w-none overflow-y-auto h-full pointer-events-none"
            style={{ minHeight: "500px", maxHeight: "700px" }}
            dangerouslySetInnerHTML={{ __html: templateContent }}
          />

          {/* Company Signature Marker */}
          <div
            className={`absolute cursor-move transition-shadow ${
              dragging === "company" ? "shadow-lg ring-2 ring-blue-400" : "shadow-md"
            }`}
            style={{
              left: `${positions.company.x}%`,
              top: `${positions.company.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: dragging === "company" ? 20 : 10,
            }}
            onMouseDown={handleMouseDown("company")}
            onTouchStart={handleTouchStart("company")}
          >
            <div className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium">Assinatura Empresa</span>
            </div>
            <div className="absolute left-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-500 transform -translate-x-1/2" />
          </div>

          {/* Client Signature Marker */}
          <div
            className={`absolute cursor-move transition-shadow ${
              dragging === "client" ? "shadow-lg ring-2 ring-green-400" : "shadow-md"
            }`}
            style={{
              left: `${positions.client.x}%`,
              top: `${positions.client.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: dragging === "client" ? 20 : 10,
            }}
            onMouseDown={handleMouseDown("client")}
            onTouchStart={handleTouchStart("client")}
          >
            <div className="bg-green-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
              <User className="h-4 w-4" />
              <span className="text-xs font-medium">Assinatura Cliente</span>
            </div>
            <div className="absolute left-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-500 transform -translate-x-1/2" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <strong>Empresa:</strong> X: {positions.company.x.toFixed(1)}%, Y: {positions.company.y.toFixed(1)}%
          </div>
          <div>
            <strong>Cliente:</strong> X: {positions.client.x.toFixed(1)}%, Y: {positions.client.y.toFixed(1)}%
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPositionsChange({
                company: { x: 25, y: 90 },
                client: { x: 75, y: 90 },
              })
            }
          >
            Posição Padrão (Lado a Lado)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPositionsChange({
                company: { x: 50, y: 85 },
                client: { x: 50, y: 95 },
              })
            }
          >
            Posição Padrão (Empilhadas)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
