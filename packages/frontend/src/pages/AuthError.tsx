import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function AuthErrorPage() {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('message') || 'Authentication failed';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle>Authentication Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{message}</p>
          <Button asChild>
            <Link to="/login">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
