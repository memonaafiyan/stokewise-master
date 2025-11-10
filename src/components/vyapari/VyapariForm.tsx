import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

type Vyapari = Tables<"vyapari">;

interface VyapariFormProps {
  vyapari?: Vyapari;
  onSubmit: (data: VyapariFormData) => void;
  onCancel: () => void;
}

export interface VyapariFormData {
  name: string;
  contact: string;
  email?: string;
  address?: string;
}

export function VyapariForm({ vyapari, onSubmit, onCancel }: VyapariFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VyapariFormData>({
    defaultValues: vyapari
      ? {
          name: vyapari.name,
          contact: vyapari.contact,
          email: vyapari.email || "",
          address: vyapari.address || "",
        }
      : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register("name", { required: "Name is required" })}
          placeholder="Customer name"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact">Contact Number *</Label>
        <Input
          id="contact"
          {...register("contact", { required: "Contact is required" })}
          placeholder="Phone number"
        />
        {errors.contact && (
          <p className="text-sm text-destructive">{errors.contact.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="email@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register("address")}
          placeholder="Full address"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {vyapari ? "Update" : "Create"} Vyapari
        </Button>
      </div>
    </form>
  );
}
