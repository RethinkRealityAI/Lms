'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { H5PContentManager } from '@/components/h5p/h5p-content-manager';

export default function AdminH5PPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>H5P Content Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Register tenant-scoped H5P content entries. Use these keys in lesson blocks of type
            <code className="ml-1">h5p</code>.
          </p>
          <H5PContentManager />
        </CardContent>
      </Card>
    </div>
  );
}
