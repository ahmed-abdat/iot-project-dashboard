"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type Alert,
  type CreateAlertInput,
  ALERT_DEFAULTS,
} from "@/lib/stores/alert-store";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  type: z.enum(["anomalyScore", "vibrationMagnitude", "classificationConfidence", "motorHealth"]),
  operator: z.enum(["above", "below", "between"]),
  threshold: z.coerce.number().min(0).max(100),
  thresholdHigh: z.coerce.number().min(0).max(100).optional(),
  message: z.string().min(1).max(200),
  priority: z.enum(["low", "medium", "high"]),
});

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: Alert | null;
  onSubmit: (data: CreateAlertInput) => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  alert,
  onSubmit,
}: AlertDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "anomalyScore",
      operator: "above",
      threshold: 80,
      message: "",
      priority: "medium",
    },
  });

  useEffect(() => {
    if (alert) {
      form.reset({
        type: alert.type,
        operator: alert.operator,
        threshold: alert.threshold,
        thresholdHigh: alert.thresholdHigh,
        message: alert.message,
        priority: alert.priority,
      });
    } else {
      form.reset({
        type: "anomalyScore",
        operator: "above",
        threshold: 80,
        message: "",
        priority: "medium",
      });
    }
  }, [alert, form]);

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit(data);
  };

  const type = form.watch("type");
  const operator = form.watch("operator");
  const defaults = ALERT_DEFAULTS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] sm:max-h-[85vh]">
        <DialogHeader className="space-y-1">
          <DialogTitle>{alert ? "Edit Alert" : "Create Alert"}</DialogTitle>
          <DialogDescription>
            Configure alert conditions and notifications
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor Metric</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a metric to monitor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="anomalyScore">Anomaly Score</SelectItem>
                        <SelectItem value="vibrationMagnitude">Vibration Magnitude</SelectItem>
                        <SelectItem value="classificationConfidence">Classification Confidence</SelectItem>
                        <SelectItem value="motorHealth">Motor Health Score</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {ALERT_DEFAULTS[field.value]?.description || "Select the motor metric to monitor"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="above">Above</SelectItem>
                        <SelectItem value="below">Below</SelectItem>
                        <SelectItem value="between">Between</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose when the alert should be triggered
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div
              className={
                operator === "between" ? "grid gap-6 sm:grid-cols-2" : ""
              }
            >
              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {operator === "between" ? "Minimum" : "Threshold"} Value
                    </FormLabel>
                    <FormControl>
                      <div className="flex max-w-[240px]">
                        <Input
                          type="number"
                          {...field}
                          className="rounded-r-none"
                          min={defaults.min}
                          max={defaults.max}
                          step={defaults.step}
                        />
                        <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted">
                          {defaults.unit}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {operator === "between"
                        ? "Minimum value to trigger the alert"
                        : `Value to trigger the alert when ${operator}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {operator === "between" && (
                <FormField
                  control={form.control}
                  name="thresholdHigh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Value</FormLabel>
                      <FormControl>
                        <div className="flex max-w-[240px]">
                          <Input
                            type="number"
                            {...field}
                            className="rounded-r-none"
                            min={defaults.min}
                            max={defaults.max}
                            step={defaults.step}
                          />
                          <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted">
                            {defaults.unit}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum value to trigger the alert
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Set the priority level for this alert
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a message to display when the alert is triggered"
                        className="resize-none h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be displayed when the alert is triggered
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {alert ? "Update Alert" : "Create Alert"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
