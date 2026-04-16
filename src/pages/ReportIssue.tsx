import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type IssueCategory = Database["public"]["Enums"]["issue_category"];

const categoryOptions: { value: IssueCategory; label: string }[] = [
  { value: "drainage", label: "Drainage" },
  { value: "garbage", label: "Garbage" },
  { value: "electrical", label: "Electrical" },
  { value: "road", label: "Road" },
  { value: "water", label: "Water" },
  { value: "sanitation", label: "Sanitation" },
  { value: "other", label: "Other" },
];

export default function ReportIssue() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IssueCategory>("other");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Only volunteers can report issues
  if (role !== "volunteer") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Only volunteers can report issues.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("issue-images")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("issue-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const { error } = await supabase.from("issues").insert({
        reported_by: user.id,
        title,
        description,
        category,
        address,
        image_url: imageUrl,
        latitude: lat,
        longitude: lng,
      });

      if (error) throw error;

      toast({ title: "Issue Reported!", description: "Your report has been submitted." });
      navigate("/issues");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-xl font-bold text-foreground mb-6">Report an Issue</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Issue Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <Select value={category} onValueChange={(v) => setCategory(v as IssueCategory)}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Address / Location" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <label className="flex items-center gap-3 p-4 bg-card rounded-xl border border-dashed border-border cursor-pointer hover:border-primary transition-colors">
          <Camera className="w-6 h-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-card-foreground">
              {imageFile ? imageFile.name : "Upload Photo"}
            </p>
            <p className="text-xs text-muted-foreground">Tap to select an image</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </label>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </Button>
      </form>
    </div>
  );
}
