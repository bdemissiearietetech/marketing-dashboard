import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SectionErrorProps {
  title: string;
  message: string;
}

export function SectionError({ title, message }: SectionErrorProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
        <div className="space-y-1 text-sm">
          <div className="font-medium">{title}</div>
          <div className="text-muted-foreground break-all">{message}</div>
        </div>
      </CardContent>
    </Card>
  );
}
