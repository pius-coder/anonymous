"use client";

import { useState } from "react";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";
import { Label } from "@/components/retroui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/retroui/alert";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/retroui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/retroui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/retroui/tabs";
import { Avatar, AvatarFallback } from "@/components/retroui/avatar";
import { Separator } from "@/components/retroui/separator";
import { Switch } from "@/components/retroui/switch";
import { Checkbox } from "@/components/retroui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/retroui/radio-group";
import { Textarea } from "@/components/retroui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/retroui/select";
import { Slider } from "@/components/retroui/slider";
import { Skeleton } from "@/components/retroui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/retroui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/retroui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/retroui/toggle-group";
import { Progress } from "@/components/retroui/progress";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/retroui/drawer";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/retroui/sheet";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/retroui/command";
import { Calendar } from "@/components/retroui/calendar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/retroui/collapsible";
import { ScrollArea } from "@/components/retroui/scroll-area";
import { PhaseFlowImage } from "@/components/game/generated-art";
import { ArenaPoster } from "@/components/game/game-visuals";
import {
  CountdownRing,
  EliminationOverlay,
  PhaseTransition,
  ScorePop,
} from "@/components/game/motion-primitives";

export default function DevUIShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [toggleValue, setToggleValue] = useState<string[]>(["center"]);
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [radioValue, setRadioValue] = useState("option1");
  const [progressValue] = useState(65);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [phase, setPhase] = useState("Lobby");
  const [eliminationOpen, setEliminationOpen] = useState(false);
  const demoNow = 1_800_000;
  const demoDeadline = demoNow + 42_000;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* ═══════════════════════════════════════════════════════════
            HERO — two-column, mirrors Retroui.dev hero exactly
        ═══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-b-2 border-border">
          <div className="relative container mx-auto grid grid-cols-1 items-center gap-14 px-4 pt-14 pb-20 sm:pt-16 lg:grid-cols-2 lg:gap-12 lg:pt-20 lg:pb-24">
            {/* ── Left column: text ────────────────────────────── */}
            <div className="flex max-w-2xl flex-col items-start">
              <Badge
                variant="secondary"
                className="mb-8 h-7 gap-1.5 px-3 text-sm shadow-[3px_3px_0_0_var(--foreground)]"
              >
                🎮 PLAYER 1 · READY
              </Badge>
              <h1 className="font-head text-5xl leading-[1.04] font-bold tracking-tight text-balance uppercase sm:text-6xl sm:leading-[1.02] xl:text-7xl">
                <span className="sr-only">Game Lobby Design System</span>
                <span aria-hidden="true">
                  Game Lobby
                  <br />
                  <span className="text-primary">Design System</span>
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg font-medium text-foreground/80 text-balance">
                La plateforme de sessions compétitives. Composants neobrutalistes, bordures
                épaisses, ombres dures, couleurs vives.{" "}
                <span className="font-bold text-foreground">Le code est à vous.</span>
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button size="lg">Explorer les composants</Button>
                <Button size="lg" variant="outline">
                  Voir la documentation
                </Button>
              </div>
              {/* ── Code block ──────────────────────────────────── */}
              <div className="mt-8 w-full max-w-sm">
                <div className="relative">
                  <div className="absolute border-2 border-border -bottom-1.5 -right-1.5 left-1.5 top-1.5 bg-primary" />
                  <div className="relative border-2 border-border bg-background p-3">
                    <div className="mb-3 flex items-center gap-1.5 border-b-2 border-border pb-2">
                      <span className="size-2.5 rounded-full border border-border bg-destructive" />
                      <span className="size-2.5 rounded-full border border-border bg-primary" />
                      <span className="size-2.5 rounded-full border border-border bg-chart-2" />
                      <div className="ml-auto" />
                    </div>
                    <code className="font-mono text-sm">pnpm dlx shadcn add @retroui/button</code>
                  </div>
                </div>
              </div>
              {/* ── Social proof ────────────────────────────────── */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <p className="text-sm leading-tight font-medium">
                  Adopté par
                  <br />
                  <span className="font-bold">1 500+</span> joueurs
                </p>
                <div aria-hidden="true" className="hidden h-8 w-0.5 bg-border sm:block" />
                <p className="text-sm leading-tight font-medium">
                  <span className="font-bold">49</span> composants RetroUI
                  <br />
                  Prêts à l&apos;emploi
                </p>
              </div>
            </div>
            {/* ── Right column: interactive board ─────────────── */}
            <div className="relative w-full max-w-xl justify-self-center lg:justify-self-end">
              <div className="relative">
                <div className="absolute border-2 border-border -bottom-2 -right-2 left-2 top-2 bg-primary" />
                <div className="relative border-2 border-border bg-card p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    <div className="col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="font-head text-lg">Ship something loud</CardTitle>
                          <CardDescription>
                            Chaque élément ici est un vrai composant RetroUI.
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="gap-3">
                          <Button size="sm">Ship it</Button>
                          <Button size="sm" variant="outline">
                            Docs
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                    <div className="flex h-full items-center justify-between gap-3 border-2 border-border bg-background p-4 shadow-md">
                      <span className="font-head text-sm font-medium">Dark mode</span>
                      <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                    </div>
                    <div className="flex h-full items-center border-2 border-border bg-background p-4 shadow-md justify-center gap-2">
                      <Badge>New</Badge>
                      <Badge variant="secondary">50+</Badge>
                      <Badge variant="outline">RTL</Badge>
                    </div>
                    <div className="col-span-2 flex h-full justify-between border-2 border-border bg-background p-4 shadow-md flex-col items-stretch gap-3">
                      <div className="flex items-center justify-between font-head text-sm font-medium">
                        <span>Chaos level</span>
                        <span className="tabular-nums">{sliderValue[0]}%</span>
                      </div>
                      <Slider
                        value={sliderValue}
                        onValueChange={(v) => setSliderValue(Array.isArray(v) ? [...v] : [v])}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="flex h-full border-2 border-border bg-background p-4 shadow-md flex-col items-start justify-center gap-2.5">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={checkbox1}
                          onCheckedChange={(v) => setCheckbox1(v === true)}
                        />
                        Thick borders
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={checkbox2}
                          onCheckedChange={(v) => setCheckbox2(v === true)}
                        />
                        Hard shadows
                      </label>
                    </div>
                    <div className="flex h-full border-2 border-border bg-background p-4 shadow-md flex-col items-start justify-center gap-2">
                      <kbd className="inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded border-2 bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground shadow-sm">
                        ⌘K
                      </kbd>
                      <span className="text-sm font-medium text-muted-foreground">
                        Chercher dans la doc
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            FEATURES MARQUEE — mirrors Retroui.dev marquee
        ═══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-t-2 border-border bg-foreground py-2.5 text-background">
          <div className="flex w-max animate-marquee">
            {[1, 2].map((_, idx) => (
              <ul key={idx} className="flex shrink-0 items-center" aria-hidden={idx > 0}>
                {[
                  "49 composants installés",
                  "Base UI & Radix",
                  "shadcn CLI compatible",
                  "Open source",
                  "Build offline OK",
                  "Tailwind v4",
                  "Next.js 16",
                  "Dark mode",
                  "Neobrutalism forever",
                  "TypeScript",
                ].map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-4 px-4 font-head text-sm font-medium tracking-wider whitespace-nowrap uppercase"
                  >
                    <span aria-hidden="true" className="text-primary">
                      ★
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            GAME LOBBY — matchmaking interactive playground
        ═══════════════════════════════════════════════════════════ */}
        <section className="border-b-2 border-border bg-[#fff7e8]">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <h2 className="font-head text-4xl font-black uppercase md:text-5xl">Matchmaking</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Chaque carte est une session réelle. Composants RetroUI en conditions réelles :
              rejoignez, observez, voyez les scores en direct.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Card className="border-2 border-border shadow-[4px_4px_0_0_var(--border)]">
                <CardHeader>
                  <CardTitle className="font-head text-lg">Tournoi Flash — 1v1</CardTitle>
                  <CardAction>
                    <Badge className="bg-green-500 text-black">MATCHMAKING</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>P1</AvatarFallback>
                      </Avatar>
                      <span className="font-head text-sm font-bold">Player_42</span>
                    </div>
                    <span className="font-head text-lg font-black">VS</span>
                    <div className="flex items-center gap-2">
                      <span className="font-head text-sm font-bold">GamerPro99</span>
                      <Avatar size="sm">
                        <AvatarFallback>P2</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Joueurs cherchés</span>
                      <span>8 / 12</span>
                    </div>
                    <Progress value={67} />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Rejoindre
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Observer
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-2 border-border shadow-[4px_4px_0_0_var(--border)]">
                <CardHeader>
                  <CardTitle className="font-head text-lg">Classement live</CardTitle>
                  <CardAction>
                    <Badge className="bg-yellow-400 text-black">TOP 3</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {["Player_42", "GamerPro99", "NinjaFR", "ChampionX"].map((name, i) => (
                      <div
                        key={name}
                        className="flex items-center justify-between border-b-2 border-border pb-1 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-head text-sm font-black ${i < 3 ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {i + 1}
                          </span>
                          <Avatar size="sm">
                            <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {(2450 - i * 330).toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline" className="w-full">
                    Voir tout le classement
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-2 border-border shadow-[4px_4px_0_0_var(--border)]">
                <CardHeader>
                  <CardTitle className="font-head text-lg">Notifications live</CardTitle>
                  <CardAction>
                    <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Alert className="border-blue-500 bg-blue-500/10">
                    <AlertTitle>Nouveau défi</AlertTitle>
                    <AlertDescription>ChampionX vous a défié en 1v1</AlertDescription>
                  </Alert>
                  <Alert variant="destructive">
                    <AlertTitle>Élimination</AlertTitle>
                    <AlertDescription>NinjaFR a été éliminé en phase 2</AlertDescription>
                  </Alert>
                  <Alert className="border-green-500 bg-green-500/10">
                    <AlertTitle>Victoire</AlertTitle>
                    <AlertDescription>Player_42 remporte le Tournoi Flash !</AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Badge className="w-full justify-center" variant="ghost">
                    3 notifications actives
                  </Badge>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12">
          <section className="mb-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Badge>VISUAL SYSTEM</Badge>
                <h2 className="font-head text-3xl font-black uppercase">SVG gaming</h2>
              </div>
              <ArenaPoster />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="font-head text-2xl uppercase">Primitives Motion</CardTitle>
                <CardDescription>
                  Animations courtes, lisibles, et compatibles avec prefers-reduced-motion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <CountdownRing
                    deadlineEpochMs={demoDeadline}
                    nowEpochMs={demoNow}
                    totalMs={60_000}
                  />
                  <div className="space-y-2">
                    <PhaseTransition phase={phase}>
                      <div className="border-2 border-border bg-primary px-4 py-3 font-head text-xl font-black uppercase shadow-md">
                        {phase}
                      </div>
                    </PhaseTransition>
                    <div className="flex gap-2">
                      {["Lobby", "Round", "Decision"].map((nextPhase) => (
                        <Button
                          key={nextPhase}
                          size="xs"
                          variant={phase === nextPhase ? "default" : "outline"}
                          onClick={() => setPhase(nextPhase)}
                        >
                          {nextPhase}
                        </Button>
                      ))}
                    </div>
                    <ScorePop value={250} />
                  </div>
                </div>
                <PhaseFlowImage className="min-h-[220px] border-2 border-border shadow-md" />
              </CardContent>
              <CardFooter className="gap-2">
                <Button onClick={() => setEliminationOpen(true)}>Tester overlay</Button>
                <Button variant="outline" onClick={() => setEliminationOpen(false)}>
                  Fermer
                </Button>
              </CardFooter>
            </Card>
            <EliminationOverlay visible={eliminationOpen} playerName="Player_42" />
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: BUTTONS
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Button</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Les boutons sont l&apos;élément fondamental. Variants pour chaque contexte : action
              principale, secondaire, destructive, navigation.
            </p>
            <Card className="max-w-4xl">
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    Variants
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    Tailles
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="xs">XS</Button>
                    <Button size="sm">SM</Button>
                    <Button>Default</Button>
                    <Button size="lg">LG</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    États
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button disabled>Disabled</Button>
                    <Button variant="outline" disabled>
                      Disabled Outline
                    </Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    Contexte jeu
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="bg-green-500 text-black hover:bg-green-600">
                      Lancer le match
                    </Button>
                    <Button variant="destructive">Abandonner</Button>
                    <Button variant="outline">Défier — 500 pts</Button>
                    <Button variant="secondary" disabled>
                      En attente...
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: BADGES
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Badge</h2>
            </div>
            <Card className="max-w-4xl">
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    Variants
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="ghost">Ghost</Badge>
                    <Badge variant="link">Link</Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    États session
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-green-500 text-black">PUBLISHED</Badge>
                    <Badge className="bg-yellow-400 text-black">WAITING_PLAYERS</Badge>
                    <Badge className="bg-blue-500 text-white">IN_PROGRESS</Badge>
                    <Badge className="bg-gray-400 text-black">COMPLETED</Badge>
                    <Badge variant="destructive">CANCELLED</Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="mb-3 block font-head text-xs uppercase tracking-wider text-muted-foreground">
                    Visibilité
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-emerald-500 text-black">PUBLIC</Badge>
                    <Badge className="bg-amber-500 text-black">UNLISTED</Badge>
                    <Badge variant="destructive">PRIVATE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: CARDS
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Card</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Les cartes affichent les parties, les profils de joueurs, les résultats. Header (titre
              + action), Content, Footer.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Match card — open */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">1v1 Showdown</CardTitle>
                  <CardDescription>Partie publique — 2 joueurs max</CardDescription>
                  <CardAction>
                    <Badge className="bg-green-500 text-black">MATCHMAKING</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Défi : 500 pts</p>
                    <p>Carte : Arena Alpha</p>
                    <p>Joueurs : 1 / 2</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button size="sm" className="w-full">
                    Rejoindre
                  </Button>
                </CardFooter>
              </Card>

              {/* Match card — in progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Battle Royale</CardTitle>
                  <CardDescription>Round 2 — 8 joueurs restants</CardDescription>
                  <CardAction>
                    <Badge className="bg-blue-500 text-white">EN DIRECT</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Zone safe</span>
                        <span>65%</span>
                      </div>
                      <Progress value={progressValue} />
                    </div>
                    <p className="text-xs text-muted-foreground">Joueurs éliminés : 4 / 12</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline" className="w-full">
                    Observer
                  </Button>
                </CardFooter>
              </Card>

              {/* Match card — completed */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Tournoi Quiz</CardTitle>
                  <CardDescription>Terminé — Résultats disponibles</CardDescription>
                  <CardAction>
                    <Badge className="bg-gray-400 text-black">TERMINÉ</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Vainqueur : Player_42</p>
                    <p>Score final : 2 450 pts</p>
                    <p>Participants : 10</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="ghost" className="w-full">
                    Voir le résumé
                  </Button>
                </CardFooter>
              </Card>

              {/* Profile card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback>P1</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-head">Player_42</CardTitle>
                      <CardDescription>Rang Or — Niveau 8</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Wins: 24</Badge>
                    <Badge variant="outline">Losses: 8</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Season access card */}
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="font-head text-xl">Accès saison</CardTitle>
                  <CardDescription>Paramètres internes et avantages de session</CardDescription>
                  <CardAction>
                    <Badge className="bg-primary text-black">CONFIGURÉ</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="font-head text-3xl font-black">
                    5 000 XAF
                    <span className="text-sm font-normal text-muted-foreground"> /saison</span>
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full font-head">Configurer</Button>
                </CardFooter>
              </Card>

              {/* Quick result card */}
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="font-head">Résultat rapide</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    +120 pts · Classement : 3ème sur 10
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: FORMS
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Forms</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Input, Select, Checkbox, Switch, Radio, Slider — tout pour créer un profil joueur,
              configurer une partie, gérer les préférences.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Input + Label */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Input + Label</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Gamertag</Label>
                    <Input placeholder="Entrez votre pseudo..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="joueur@exemple.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Désactivé (banni)</Label>
                    <Input disabled placeholder="Compte suspendu" />
                  </div>
                </CardContent>
              </Card>

              {/* Textarea */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Textarea</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Description du profil</Label>
                    <Textarea placeholder="Parlez de vous..." rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message (désactivé)</Label>
                    <Textarea disabled placeholder="Indisponible" />
                  </div>
                </CardContent>
              </Card>

              {/* Select */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Select</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Mode de jeu</Label>
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Solo — Deathmatch</SelectItem>
                        <SelectItem value="duo">Duo — 2v2</SelectItem>
                        <SelectItem value="team">Team — 4v4</SelectItem>
                        <SelectItem value="br">Battle Royale — 12 joueurs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Switch + Checkbox */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Switch + Checkbox</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Notifications de partie</Label>
                    <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms"
                        checked={checkbox1}
                        onCheckedChange={(v) => setCheckbox1(v === true)}
                      />
                      <Label htmlFor="terms" className="text-sm">
                        J&apos;accepte le code du joueur
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="newsletter"
                        checked={checkbox2}
                        onCheckedChange={(v) => setCheckbox2(v === true)}
                      />
                      <Label htmlFor="newsletter" className="text-sm">
                        Recevoir les alertes de matchs
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Radio Group */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Radio Group</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="option1" id="r1" />
                      <Label htmlFor="r1">Deathmatch</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="option2" id="r2" />
                      <Label htmlFor="r2">Élimination</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="option3" id="r3" />
                      <Label htmlFor="r3">Capture de drapeau</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Slider */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Slider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Points de défi</Label>
                      <span className="font-mono text-muted-foreground">{sliderValue[0]} pts</span>
                    </div>
                    <Slider
                      value={sliderValue}
                      onValueChange={(v) => setSliderValue(Array.isArray(v) ? [...v] : [v])}
                      max={1000}
                      step={50}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: AVATARS + PROGRESS
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Avatar + Progress</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Avatar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar size="sm">
                      <AvatarFallback>P</AvatarFallback>
                    </Avatar>
                    <Avatar>
                      <AvatarFallback>J</AvatarFallback>
                    </Avatar>
                    <Avatar size="lg">
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <Avatar size="lg">
                      <AvatarFallback>P1</AvatarFallback>
                    </Avatar>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Phase 1</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Phase 2</span>
                      <span>65%</span>
                    </div>
                    <Progress value={65} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Phase 3</span>
                      <span>30%</span>
                    </div>
                    <Progress value={30} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Phase 4</span>
                      <span>0%</span>
                    </div>
                    <Progress value={0} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: TABS
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Tabs</h2>
            </div>
            <Card className="max-w-3xl">
              <CardContent className="pt-6">
                <Tabs defaultValue="sessions">
                  <TabsList>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="classement">Classement</TabsTrigger>
                    <TabsTrigger value="historique">Historique</TabsTrigger>
                    <TabsTrigger value="stats">Statistiques</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sessions">
                    <div className="space-y-3 p-4">
                      <div className="flex items-center justify-between rounded-none border-2 border-border p-3">
                        <div>
                          <p className="font-head font-bold">1v1 Showdown</p>
                          <p className="text-sm text-muted-foreground">
                            2/2 joueurs — Démarre dans 30s
                          </p>
                        </div>
                        <Badge className="bg-green-500 text-black">MATCHMAKING</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-none border-2 border-border p-3">
                        <div>
                          <p className="font-head font-bold">Battle Royale</p>
                          <p className="text-sm text-muted-foreground">8/12 joueurs — En cours</p>
                        </div>
                        <Badge className="bg-blue-500 text-white">EN DIRECT</Badge>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="classement">
                    <div className="space-y-2 p-4">
                      {["Player_42", "GamerPro99", "NinjaFR", "ChampionX"].map((name, i) => (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-none border-2 border-border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-head font-bold">{name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm">{1000 - i * 120} pts</span>
                            <Badge variant={i === 0 ? "default" : "secondary"}>#{i + 1}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="historique">
                    <div className="space-y-2 p-4">
                      {[
                        "vs GamerPro99 — Victoire",
                        "vs NinjaFR — Défaite",
                        "vs ChampionX — Victoire",
                      ].map((m, i) => (
                        <div key={i} className="border-2 border-border p-3 text-sm">
                          <span className="font-head font-bold">{m}</span>
                          <span className="ml-2 text-muted-foreground">· +{120 - i * 40} pts</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="stats">
                    <p className="p-4 text-muted-foreground">
                      K/D ratio, win rate, streaks. Stats détaillées à implémenter avec Feature 06.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: ALERTS
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Alert</h2>
            </div>
            <div className="max-w-2xl space-y-4">
              <Alert>
                <AlertTitle>Nouveau défi</AlertTitle>
                <AlertDescription>
                  GamerPro99 vous a défié en 1v1. Acceptez dans le lobby !
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Élimination</AlertTitle>
                <AlertDescription>
                  Vous avez été éliminé en phase 2. Vous pouvez regarder en mode spectateur.
                </AlertDescription>
              </Alert>
              <Alert className="border-green-500 bg-green-500/10">
                <AlertTitle>Victoire royale</AlertTitle>
                <AlertDescription>
                  Player_42 remporte le Battle Royale avec 2 450 points !
                </AlertDescription>
              </Alert>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: DIALOG
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Dialog</h2>
            </div>
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger render={<Button />}>Ouvrir le dialog</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmer le défi</DialogTitle>
                      <DialogDescription>
                        Vous allez défier GamerPro99 en 1v1 — 500 pts. Mode : Deathmatch.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={() => setDialogOpen(false)}>Lancer le match !</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: TABLE
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Table</h2>
            </div>
            <Card className="max-w-3xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-head">#</TableHead>
                    <TableHead className="font-head">Joueur</TableHead>
                    <TableHead className="font-head">Kills</TableHead>
                    <TableHead className="font-head">Dégâts</TableHead>
                    <TableHead className="font-head">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-head font-black">1</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>P1</AvatarFallback>
                      </Avatar>
                      Player_42
                    </TableCell>
                    <TableCell className="font-mono">12</TableCell>
                    <TableCell className="font-mono">2 450</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500 text-black">Vainqueur</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-head font-black">2</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>GP</AvatarFallback>
                      </Avatar>
                      GamerPro99
                    </TableCell>
                    <TableCell className="font-mono">8</TableCell>
                    <TableCell className="font-mono">2 120</TableCell>
                    <TableCell>
                      <Badge variant="secondary">2ème</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-head font-black">3</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>NF</AvatarFallback>
                      </Avatar>
                      NinjaFR
                    </TableCell>
                    <TableCell className="font-mono">6</TableCell>
                    <TableCell className="font-mono">1 890</TableCell>
                    <TableCell>
                      <Badge variant="secondary">3ème</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-head font-black">4</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>NB</AvatarFallback>
                      </Avatar>
                      Newbie2026
                    </TableCell>
                    <TableCell className="font-mono">2</TableCell>
                    <TableCell className="font-mono">820</TableCell>
                    <TableCell>
                      <Badge variant="outline">Éliminé</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: TOGGLE + TOOLTIP + POPOVER
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">
                Toggle · Tooltip · Popover
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Toggle Group</CardTitle>
                </CardHeader>
                <CardContent>
                  <ToggleGroup value={toggleValue} onValueChange={(v) => setToggleValue([...v])}>
                    <ToggleGroupItem value="left">Gauche</ToggleGroupItem>
                    <ToggleGroupItem value="center">Centre</ToggleGroupItem>
                    <ToggleGroupItem value="right">Droite</ToggleGroupItem>
                  </ToggleGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Tooltip</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger render={<Button />}>Hover moi</TooltipTrigger>
                    <TooltipContent>
                      <p>Info utile sur cet élément</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-head">Popover</CardTitle>
                </CardHeader>
                <CardContent>
                  <Popover>
                    <PopoverTrigger render={<Button variant="outline" />}>
                      Ouvrir le popover
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-2">
                        <p className="font-head font-bold">Détails rapides</p>
                        <p className="text-sm text-muted-foreground">
                          Informations contextuelles pour cet élément.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: SKELETON
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Skeleton</h2>
            </div>
            <Card className="max-w-md">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: SEPARATOR
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Separator</h2>
            </div>
            <Card className="max-w-md">
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-muted-foreground">Contenu au-dessus du séparateur.</p>
                <Separator />
                <p className="text-sm text-muted-foreground">Contenu en dessous du séparateur.</p>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">
                  Séparateur horizontal avec espacement.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: DRAWER
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Drawer</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Panneau mobile pour les détails de match, les profils adverses, les configurations
              rapides.
            </p>
            <div className="flex flex-wrap gap-4">
              <Drawer>
                <DrawerTrigger>Détails du match</DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Battle Royale — Round 2</DrawerTitle>
                    <DrawerDescription>
                      8/12 joueurs · Zone safe à 65% · 3min restantes
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ta存活</span>
                      <Badge className="bg-green-500 text-black">EN VIE</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Kills</span>
                      <span className="font-head font-bold">4</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Position</span>
                      <span className="font-head font-bold">#3</span>
                    </div>
                    <Separator />
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Prochain rétrécissement</span>
                        <span>30s</span>
                      </div>
                      <Progress value={85} />
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button className="w-full">Continuer à jouer</Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: SHEET
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Sheet</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Panneau latéral. Parfait pour les paramètres, le profil utilisateur, les
              notifications.
            </p>
            <div className="flex flex-wrap gap-4">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" />}>Ouvrir le panneau</SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Profil Joueur</SheetTitle>
                    <SheetDescription>Gérez votre profil et vos préférences</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 p-6">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        <AvatarFallback>P1</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-head font-bold">Player_42</p>
                        <p className="text-sm text-muted-foreground">Niveau 8</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label>Notifications</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Son</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: ALERT DIALOG
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Alert Dialog</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Dialogue de confirmation pour les actions critiques : quitter une session, annuler une
              inscription, supprimer un compte.
            </p>
            <div className="flex flex-wrap gap-4">
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  Quitter la session
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer l&apos;action</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous allez quitter la session. Cette action est irréversible et votre place
                      sera libérée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel render={<Button variant="outline" />}>
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction render={<Button variant="destructive" />}>
                      Quitter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: CALENDAR
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Calendar</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Sélecteur de date pour planifier les sessions, voir le calendrier des événements,
              filtrer l&apos;historique.
            </p>
            <Card className="w-fit">
              <CardContent className="p-4">
                <Calendar mode="single" />
              </CardContent>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: COLLAPSIBLE
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Collapsible</h2>
            </div>
            <div className="max-w-md space-y-3">
              <Collapsible className="border-2 border-border">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-head font-bold cursor-pointer hover:bg-accent">
                  <span>Règles de la session</span>
                  <span className="text-muted-foreground">▼</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t-2 border-border p-4 text-sm text-muted-foreground">
                    <p>1. Chaque joueur doit être présent 5 minutes avant le début.</p>
                    <p className="mt-2">2. Les décisions de l&apos;arbitre sont finales.</p>
                    <p className="mt-2">3. Tout comportement antisportif sera sanctionné.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <Collapsible className="border-2 border-border">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-head font-bold cursor-pointer hover:bg-accent">
                  <span>Récompenses</span>
                  <span className="text-muted-foreground">▼</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t-2 border-border p-4 text-sm text-muted-foreground">
                    <p>1er : 5 000 XAF · 2ème : 3 000 XAF · 3ème : 1 000 XAF</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: COMMAND
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Command</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Palette de commandes pour la navigation rapide. Ouvrez-la avec le bouton ci-dessous et
              tapez pour chercher des sessions, des joueurs, etc.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setCmdOpen(true)} variant="outline" className="gap-2">
                <span className="font-mono text-xs">⌘K</span>
                Ouvrir la palette
              </Button>
              <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
                <Command>
                  <CommandInput placeholder="Tapez une commande ou cherchez..." />
                  <CommandList>
                    <CommandEmpty>Aucun résultat.</CommandEmpty>
                    <CommandGroup heading="Sessions">
                      <CommandItem onSelect={() => setCmdOpen(false)}>Tournoi Flash</CommandItem>
                      <CommandItem onSelect={() => setCmdOpen(false)}>Battle Royale</CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="Actions">
                      <CommandItem onSelect={() => setCmdOpen(false)}>
                        Créer une session
                      </CommandItem>
                      <CommandItem onSelect={() => setCmdOpen(false)}>
                        Voir le classement
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </CommandDialog>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: SCROLL AREA
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge>COMPONENT</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Scroll Area</h2>
            </div>
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle className="font-head">Historique des parties</CardTitle>
              </CardHeader>
              <ScrollArea className="h-48">
                <div className="space-y-2 p-4">
                  {Array.from({ length: 15 }, (_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-none border-2 border-border p-2 text-sm"
                    >
                      <span className="font-head font-bold">Partie #{100 + i}</span>
                      <span className="text-muted-foreground">+{120 - i * 5} pts</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </section>

          {/* ═══════════════════════════════════════════════════════════
              SECTION: WORDING CHECK
          ═══════════════════════════════════════════════════════════ */}
          <section className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <Badge variant="destructive">VERIFICATION</Badge>
              <h2 className="font-head text-3xl font-black uppercase">Wording contrôlé</h2>
            </div>
            <Alert variant="destructive" className="max-w-2xl">
              <AlertTitle>Aucun mot interdit</AlertTitle>
              <AlertDescription>
                Vérification : les libellés sensibles de Feature 01 sont contrôlés par test et ne
                doivent pas apparaître dans les parcours publics.
              </AlertDescription>
            </Alert>
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FOOTER — mirrors Retroui.dev footer
        ═══════════════════════════════════════════════════════════ */}
        <footer className="border-t-2 border-border bg-muted">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
            <div>
              <p className="font-head text-lg font-black uppercase">Session Jeu</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Plateforme de jeux compétitifs. Design system neobrutaliste.
              </p>
            </div>
            <div>
              <p className="font-head text-sm font-bold uppercase tracking-wide">Produit</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Catalogue</li>
                <li>Sessions</li>
                <li>Classements</li>
              </ul>
            </div>
            <div>
              <p className="font-head text-sm font-bold uppercase tracking-wide">Ressources</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Documentation</li>
                <li>API</li>
                <li>Statut</li>
              </ul>
            </div>
            <div>
              <p className="font-head text-sm font-bold uppercase tracking-wide">Légal</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Confidentialité</li>
                <li>Conditions</li>
              </ul>
            </div>
          </div>
          <div className="border-t-2 border-border px-6 py-4 text-center text-sm text-muted-foreground">
            © 2026 Session Jeu. Tous droits réservés.
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
