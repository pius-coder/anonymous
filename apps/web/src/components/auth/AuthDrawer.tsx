"use client";

import { cloneElement, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/retroui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/retroui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/retroui/tabs";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthDrawer({
  open,
  onOpenChange,
  defaultTab = "login",
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "login" | "register";
  trigger?: React.ReactElement;
}) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = open !== undefined;
  const shown = controlled ? open : internalOpen;
  const setShown = (v: boolean) => {
    if (controlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const triggerWithClick = trigger
    ? cloneElement(trigger, { onClick: () => setShown(true) } as Record<string, unknown>)
    : null;

  const content = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
      <TabsList className="w-full">
        <TabsTrigger value="login" className="flex-1">
          Connexion
        </TabsTrigger>
        <TabsTrigger value="register" className="flex-1">
          Inscription
        </TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="pt-4">
        <LoginForm onSuccess={() => setShown(false)} />
      </TabsContent>
      <TabsContent value="register" className="pt-4">
        <RegisterForm onSuccess={() => setShown(false)} />
      </TabsContent>
    </Tabs>
  );

  if (isMobile) {
    return (
      <>
        {triggerWithClick}
        <Drawer open={shown} onOpenChange={setShown}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-head text-2xl font-black uppercase">
                {tab === "login" ? "Connexion" : "Rejoins la partie"}
              </DrawerTitle>
              <DrawerDescription>
                {tab === "login"
                  ? "Retrouve ton compte pour continuer."
                  : "Crée ton compte en 30 secondes."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{content}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {triggerWithClick}
      <Dialog open={shown} onOpenChange={setShown}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-head text-2xl font-black uppercase">
              {tab === "login" ? "Connexion" : "Rejoins la partie"}
            </DialogTitle>
            <DialogDescription>
              {tab === "login"
                ? "Retrouve ton compte pour continuer."
                : "Crée ton compte en 30 secondes."}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">{content}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
