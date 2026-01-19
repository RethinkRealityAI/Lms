'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Key, Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

interface VerificationCode {
  id: string;
  code: string;
  role: string;
  description: string;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<VerificationCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    max_uses: 10,
    expires_at: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load verification codes', { description: error.message });
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingCode) {
        const { error } = await supabase
          .from('verification_codes')
          .update({
            description: formData.description,
            max_uses: formData.max_uses,
            expires_at: formData.expires_at || null,
            is_active: formData.is_active,
          })
          .eq('id', editingCode.id);

        if (error) throw error;
        toast.success('Verification code updated successfully');
      } else {
        const { error } = await supabase
          .from('verification_codes')
          .insert([{
            code: formData.code || generateRandomCode(),
            role: 'admin',
            description: formData.description,
            max_uses: formData.max_uses,
            expires_at: formData.expires_at || null,
            is_active: formData.is_active,
            created_by: user?.id,
          }]);

        if (error) throw error;
        toast.success('Verification code created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadCodes();
    } catch (error: any) {
      toast.error('Operation failed', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (code: VerificationCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      max_uses: code.max_uses,
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
      is_active: code.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this verification code?')) return;

    const { error } = await supabase
      .from('verification_codes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete verification code', { description: error.message });
    } else {
      toast.success('Verification code deleted successfully');
      loadCodes();
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      description: '',
      max_uses: 10,
      expires_at: '',
      is_active: true,
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const isCodeValid = (code: VerificationCode) => {
    if (!code.is_active) return false;
    if (code.current_uses >= code.max_uses) return false;
    if (code.expires_at && new Date(code.expires_at) < new Date()) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage verification codes for instructor signup
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Verification Codes</CardTitle>
            <CardDescription>
              Create and manage codes that allow new instructors to sign up
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Code
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification codes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first verification code to allow instructors to sign up
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {codes.map((code) => {
                const valid = isCodeValid(code);
                return (
                  <div
                    key={code.id}
                    className={`p-4 border rounded-lg ${valid ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(code.code, code.id)}
                          >
                            {copiedId === code.id ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {valid ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="destructive">
                              {!code.is_active ? 'Disabled' : code.current_uses >= code.max_uses ? 'Used Up' : 'Expired'}
                            </Badge>
                          )}
                        </div>
                        {code.description && (
                          <p className="text-sm text-muted-foreground mb-2">{code.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>
                            Uses: {code.current_uses} / {code.max_uses}
                          </span>
                          {code.expires_at && (
                            <span>
                              Expires: {new Date(code.expires_at).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            Created: {new Date(code.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(code)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(code.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Verification Code' : 'Create Verification Code'}
            </DialogTitle>
            <DialogDescription>
              {editingCode
                ? 'Update the verification code settings.'
                : 'Create a new code for instructors to use during signup.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {!editingCode && (
                <div className="space-y-2">
                  <Label htmlFor="code">Code (leave empty to auto-generate)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="e.g., ADMIN2026"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, code: generateRandomCode() })}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Code for January 2026 instructor cohort"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_uses">Maximum Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this code to be used for signup
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCode ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingCode ? (
                  'Update Code'
                ) : (
                  'Create Code'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
