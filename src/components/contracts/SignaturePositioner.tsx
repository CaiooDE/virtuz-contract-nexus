import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Building2, User, ZoomIn, ZoomOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const documentRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"company" | "client" | null>(null);
  const [documentHeight, setDocumentHeight] = useState(0);
  const [scale, setScale] = useState(0.6);

  // Measure document height after render
  useEffect(() => {
    if (documentRef.current) {
      const height = documentRef.current.scrollHeight;
      setDocumentHeight(height);
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
      if (!dragging || !documentRef.current) return;

      const rect = documentRef.current.getBoundingClientRect();
      const scrollTop = documentRef.current.scrollTop || 0;
      
      // Calculate position relative to the full document (including scrolled area)
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top + scrollTop) / documentRef.current.scrollHeight) * 100;

      // Clamp values between 0 and 100
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

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
      if (!dragging || !documentRef.current) return;

      const rect = documentRef.current.getBoundingClientRect();
      const scrollTop = documentRef.current.scrollTop || 0;
      const touch = e.touches[0];
      
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      const y = ((touch.clientY - rect.top + scrollTop) / documentRef.current.scrollHeight) * 100;

      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

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
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span>Empresa</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>Cliente</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
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
          className="border rounded-lg bg-muted/30 overflow-hidden"
          style={{ height: "600px" }}
        >
          <div
            ref={documentRef}
            className="h-full overflow-auto relative bg-white"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: dragging ? "grabbing" : "default" }}
          >
            {/* Document Content */}
            <div
              className="p-8 text-sm leading-relaxed prose prose-sm max-w-none origin-top-left"
              style={{ 
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: `${100 / scale}%`,
              }}
              dangerouslySetInnerHTML={{ __html: templateContent }}
            />

            {/* Company Signature Marker */}
            <div
              className={`absolute cursor-grab transition-shadow select-none ${
                dragging === "company" ? "shadow-lg ring-2 ring-blue-400 cursor-grabbing" : "shadow-md hover:shadow-lg"
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
                <span className="text-xs font-medium">Empresa</span>
              </div>
              <div className="absolute left-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-500 transform -translate-x-1/2" />
            </div>

            {/* Client Signature Marker */}
            <div
              className={`absolute cursor-grab transition-shadow select-none ${
                dragging === "client" ? "shadow-lg ring-2 ring-green-400 cursor-grabbing" : "shadow-md hover:shadow-lg"
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
                <span className="text-xs font-medium">Cliente</span>
              </div>
              <div className="absolute left-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-500 transform -translate-x-1/2" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <strong>Empresa:</strong> X: {positions.company.x.toFixed(1)}%, Y: {positions.company.y.toFixed(1)}%
            </div>
            <div>
              <strong>Cliente:</strong> X: {positions.client.x.toFixed(1)}%, Y: {positions.client.y.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onPositionsChange({
                company: { x: 25, y: 90 },
                client: { x: 75, y: 90 },
              })
            }
          >
            Lado a Lado
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onPositionsChange({
                company: { x: 50, y: 85 },
                client: { x: 50, y: 95 },
              })
            }
          >
            Empilhadas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onPositionsChange({
                company: { x: 20, y: 95 },
                client: { x: 80, y: 95 },
              })
            }
          >
            Rodapé
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Dica: Role o documento para ver todo o conteúdo. As posições são salvas em porcentagem relativa à página total.
        </p>
      </CardContent>
    </Card>
  );
}
