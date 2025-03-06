import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Context } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContextSchema } from "@shared/schema";
import { Trash2, Edit } from "lucide-react";

export default function Contexts() {
  const { toast } = useToast();
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);

  const { data: contexts } = useQuery<Context[]>({
    queryKey: ["/api/contexts"],
  });

  const form = useForm({
    resolver: zodResolver(insertContextSchema),
    defaultValues: {
      name: "",
      color: "#4CAF50",
    },
  });

  const createContext = useMutation({
    mutationFn: async (context) => {
      const res = await apiRequest("POST", "/api/contexts", context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setIsContextDialogOpen(false);
      form.reset();
      toast({
        title: "Context created",
        description: "New context has been added",
      });
    },
  });

  const updateContext = useMutation({
    mutationFn: async ({ id, ...context }) => {
      const res = await apiRequest("PATCH", `/api/contexts/${id}`, context);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      setIsContextDialogOpen(false);
      setSelectedContext(null);
      form.reset();
      toast({
        title: "Context updated",
        description: "Changes have been saved",
      });
    },
  });

  const deleteContext = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contexts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contexts"] });
      toast({
        title: "Context deleted",
        description: "Context has been removed",
      });
    },
  });

  const handleEditContext = (context: Context) => {
    setSelectedContext(context);
    form.reset(context);
    setIsContextDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contexts</h2>
          <p className="text-muted-foreground">
            Manage contexts for task organization
          </p>
        </div>
        <Button onClick={() => setIsContextDialogOpen(true)}>
          Add Context
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {contexts?.map((context) => (
          <Card key={context.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">{context.name}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditContext(context)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteContext.mutate(context.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="h-4 w-full rounded"
                style={{ backgroundColor: context.color }}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedContext ? "Edit Context" : "Create Context"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (selectedContext) {
                  updateContext.mutate({ ...data, id: selectedContext.id });
                } else {
                  createContext.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">
                {selectedContext ? "Update Context" : "Create Context"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
