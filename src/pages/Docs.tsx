import { FileText } from "lucide-react";

const Docs = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-primary mb-2">Docs</h1>
        <p className="text-lg text-muted-foreground mb-6">Coming Soon...</p>
        <a href="/" className="text-primary underline hover:no-underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default Docs;
