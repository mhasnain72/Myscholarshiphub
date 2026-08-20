import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  CreateOpportunityBody,
  GetOpportunityParams,
  LoginBody,
  ListOpportunitiesQueryParams,
  UpdateOpportunityBody,
  UpdateOpportunityParams,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { opportunitiesTable, type Opportunity } from "@workspace/db/schema";

const router: IRouter = Router();
const sessions = new Set<string>();
const SESSION_COOKIE = "myscholarship_session";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "Hasnain";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Hasnain@1234";
let seedChecked = false;

function isAdmin(req: Request) {
  const rawCookie = req.headers.cookie ?? "";
  const token = rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];
  return Boolean(token && sessions.has(token));
}

function slugify(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
}

function publicOpportunity(row: Opportunity) {
  return row;
}

async function ensureSeed() {
  if (seedChecked) return;
  seedChecked = true;
  const existing = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).limit(1);
  if (existing.length > 0) return;
  const now = new Date();
  await db.insert(opportunitiesTable).values([
    {
      title: "Global Excellence Scholarship",
      slug: slugify("Global Excellence Scholarship"),
      headline: "Study abroad with full tuition support",
      type: "scholarship",
      status: "published",
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=85",
      description: "A flagship opportunity for ambitious international students applying to leading universities.",
      deadline: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 42),
      eligibleCountries: ["Pakistan", "India", "Bangladesh", "Nigeria", "All countries"],
      eligibilityCriteria: "Open to undergraduate and postgraduate applicants with a strong academic record.",
      financialBenefits: "Full tuition, accommodation grant, travel allowance, and monthly stipend.",
      requiredDocuments: "Academic transcripts, personal statement, two recommendation letters, and passport.",
      applicationUrl: "https://example.com/apply",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 8),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 8),
    },
    {
      title: "Digital Futures Internship",
      slug: slugify("Digital Futures Internship"),
      headline: "Build products with a global technology team",
      type: "internship",
      status: "published",
      imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85",
      description: "A paid, mentor-led internship for students and recent graduates exploring technology careers.",
      deadline: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 18),
      eligibleCountries: ["Pakistan", "United Arab Emirates", "United Kingdom", "All countries"],
      eligibilityCriteria: "Applicants should be enrolled in a relevant degree or have graduated within the last two years.",
      financialBenefits: "Paid placement, mentorship, project budget, and certificate of completion.",
      requiredDocuments: "CV, portfolio or GitHub profile, and a short motivation letter.",
      applicationUrl: "https://example.com/apply",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 30),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 30),
    },
  ]);
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  const { username, password } = parsed.data;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const token = randomUUID();
  sessions.add(token);
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 7 });
  res.json({ username: ADMIN_USERNAME, role: "admin" });
});

router.post("/auth/logout", (req, res) => {
  const rawCookie = req.headers.cookie ?? "";
  const token = rawCookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.split("=")[1];
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE);
  res.status(204).send();
});

router.get("/auth/me", (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  res.json({ username: ADMIN_USERNAME, role: "admin" });
});

router.get("/opportunities", async (req, res) => {
  await ensureSeed();
  const query = ListOpportunitiesQueryParams.parse(req.query);
  const rows = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.status, "published")).orderBy(desc(opportunitiesTable.createdAt));
  const now = Date.now();
  const filtered = rows.filter((row) => {
    const matchesType = !query.type || row.type === query.type;
    const country = query.country?.toLowerCase();
    const matchesCountry = !country || row.eligibleCountries.some((item) => item.toLowerCase() === country || item.toLowerCase() === "all countries");
    const matchesPosted = !query.postedWithinHours || now - row.createdAt.getTime() <= query.postedWithinHours * 60 * 60 * 1000;
    const matchesDeadline = !query.deadlineWithinDays || row.deadline.getTime() - now <= query.deadlineWithinDays * 24 * 60 * 60 * 1000;
    const search = query.search?.toLowerCase();
    const matchesSearch = !search || [row.title, row.headline, row.description].some((value) => value?.toLowerCase().includes(search));
    return matchesType && matchesCountry && matchesPosted && matchesDeadline && matchesSearch;
  });
  res.json(filtered.map(publicOpportunity));
});

router.get("/opportunities/:id", async (req, res) => {
  const { id } = GetOpportunityParams.parse(req.params);
  const rows = isAdmin(req)
    ? await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).limit(1)
    : await db.select().from(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.status, "published"))).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.json(publicOpportunity(rows[0]));
});

router.post("/opportunities", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  const input = CreateOpportunityBody.parse(req.body);
  const [created] = await db.insert(opportunitiesTable).values({
    ...input,
    slug: slugify(input.title),
    headline: input.headline ?? null,
    applicationUrl: input.applicationUrl ?? null,
    deadline: new Date(input.deadline),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  res.status(201).json(created);
});

router.patch("/opportunities/:id", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  const { id } = UpdateOpportunityParams.parse(req.params);
  const input = UpdateOpportunityBody.parse(req.body);
  const [updated] = await db.update(opportunitiesTable).set({
    ...input,
    deadline: new Date(input.deadline),
    headline: input.headline ?? null,
    applicationUrl: input.applicationUrl ?? null,
    updatedAt: new Date(),
  }).where(eq(opportunitiesTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.json(updated);
});

router.delete("/opportunities/:id", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  const { id } = UpdateOpportunityParams.parse(req.params);
  await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  res.status(204).send();
});

router.get("/admin/opportunities", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  await ensureSeed();
  res.json(await db.select().from(opportunitiesTable).orderBy(desc(opportunitiesTable.createdAt)));
});

router.get("/admin/dashboard", async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin login required" });
    return;
  }
  await ensureSeed();
  const rows = await db.select().from(opportunitiesTable).orderBy(desc(opportunitiesTable.createdAt));
  res.json({
    total: rows.length,
    published: rows.filter((row) => row.status === "published").length,
    drafts: rows.filter((row) => row.status === "draft").length,
    scholarships: rows.filter((row) => row.type === "scholarship").length,
    internships: rows.filter((row) => row.type === "internship").length,
    recent: rows.slice(0, 5),
  });
});

export default router;