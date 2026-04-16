import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";

// ─── BRAND PLANS ─────────────────────────────────────────
const BRAND = [
  {
    id: "free", name: "Free", price: 0,
    fee: "12%", feeNote: "service fee",
    tagline: "Try the platform",
    badge: null,
    sections: [
      {
        title: "Campaigns",
        rows: [
          { label: "Active campaigns", value: "1" },
          { label: "Active collaborations", value: "3" },
          { label: "Team members", value: "1" },
        ]
      },
      {
        title: "Discovery",
        rows: [
          { label: "Browse creator profiles", check: true },
          { label: "Basic search filters", check: true },
          { label: "Save creator lists", value: "3 lists" },
          { label: "Full filters + demographics", check: false },
        ]
      },
      {
        title: "Analytics",
        rows: [
          { label: "Post-campaign summary", check: true },
          { label: "Live dashboard", check: false },
          { label: "Exportable reports", check: false },
          { label: "Sentiment analysis", check: false },
        ]
      },
      {
        title: "Support",
        rows: [
          { label: "Help docs", check: true },
          { label: "Email support", check: false },
          { label: "Priority support", check: false },
        ]
      },
    ]
  },
  {
    id: "starter", name: "Starter", price: 29,
    fee: "8%", feeNote: "service fee",
    tagline: "Local brands getting serious",
    badge: null,
    sections: [
      {
        title: "Campaigns",
        rows: [
          { label: "Active campaigns", value: "3" },
          { label: "Active collaborations", value: "10" },
          { label: "Team members", value: "2" },
        ]
      },
      {
        title: "Discovery",
        rows: [
          { label: "Browse creator profiles", check: true },
          { label: "Full search filters", check: true },
          { label: "Save creator lists", value: "10 lists" },
          { label: "Engagement + demographics", check: false },
        ]
      },
      {
        title: "Analytics",
        rows: [
          { label: "Basic dashboard (views, reach)", check: true },
          { label: "Live dashboard", check: false },
          { label: "Exportable reports", check: false },
          { label: "Sentiment analysis", check: false },
        ]
      },
      {
        title: "Support",
        rows: [
          { label: "Help docs", check: true },
          { label: "Email support (72hr)", check: true },
          { label: "Priority support", check: false },
        ]
      },
    ]
  },
  {
    id: "pro", name: "Pro", price: 89,
    fee: "6%", feeNote: "service fee",
    tagline: "Run campaigns intelligently",
    badge: "Most Popular",
    sections: [
      {
        title: "Campaigns",
        rows: [
          { label: "Active campaigns", value: "10" },
          { label: "Active collaborations", value: "30" },
          { label: "Team members", value: "3" },
        ]
      },
      {
        title: "Discovery",
        rows: [
          { label: "Full filters + demographics", check: true },
          { label: "Engagement rate data", check: true },
          { label: "Unlimited creator lists", value: "Unlimited" },
          { label: "AI-suggested creators", check: true },
        ]
      },
      {
        title: "Analytics",
        rows: [
          { label: "Live analytics dashboard", check: true },
          { label: "Engagement trends (7d, 30d, 90d)", check: true },
          { label: "Exportable reports (PDF/CSV)", check: true },
          { label: "Basic sentiment analysis", check: true },
        ]
      },
      {
        title: "Support",
        rows: [
          { label: "Help docs", check: true },
          { label: "Email support (24hr)", check: true },
          { label: "Priority support", check: false },
        ]
      },
    ]
  },
  {
    id: "premium", name: "Premium", price: 199,
    fee: "3%", feeNote: "service fee",
    tagline: "Enterprise brand intelligence",
    badge: null,
    sections: [
      {
        title: "Campaigns",
        rows: [
          { label: "Active campaigns", value: "Unlimited" },
          { label: "Active collaborations", value: "Unlimited" },
          { label: "Team members", value: "5" },
        ]
      },
      {
        title: "Discovery",
        rows: [
          { label: "Everything in Pro", check: true },
          { label: "Fake follower vetting score", check: true },
          { label: "Audience overlap detection", check: true },
          { label: "Multi-brand workspace", check: true },
        ]
      },
      {
        title: "Analytics",
        rows: [
          { label: "Full sentiment analysis", check: true },
          { label: "Brand mentions tracking", check: true },
          { label: "Shareable stakeholder reports", check: true },
          { label: "Bulk brief sending", check: true },
        ]
      },
      {
        title: "Support",
        rows: [
          { label: "Priority support (4hr)", check: true },
          { label: "Onboarding call", check: true },
          { label: "Quarterly strategy review", check: true },
        ]
      },
    ]
  },
  {
    id: "agency", name: "Agency", price: 399,
    fee: "2%", feeNote: "service fee",
    tagline: "For marketing agencies",
    badge: "Agency Plan",
    sections: [
      {
        title: "Campaigns",
        rows: [
          { label: "Active campaigns", value: "Unlimited" },
          { label: "Active collaborations", value: "Unlimited" },
          { label: "Team members", value: "10" },
        ]
      },
      {
        title: "Client Management",
        rows: [
          { label: "Client workspaces", value: "10 included" },
          { label: "Extra client workspace", value: "+$30 each" },
          { label: "Per-client dashboards", check: true },
          { label: "White-label reports", check: true },
        ]
      },
      {
        title: "Analytics",
        rows: [
          { label: "All Premium analytics", check: true },
          { label: "Shareable client reports", check: true },
          { label: "Brand mentions tracking", check: true },
          { label: "Full sentiment analysis", check: true },
        ]
      },
      {
        title: "Support",
        rows: [
          { label: "Dedicated account manager", check: true },
          { label: "Priority support (2hr)", check: true },
          { label: "Quarterly strategy reviews", check: true },
        ]
      },
    ]
  },
];

// ─── CREATOR PLANS ────────────────────────────────────────
const CREATOR = [
  {
    id: "free", name: "Free", price: 0,
    fee: "15%", feeNote: "commission",
    tagline: "Start your creator journey",
    badge: null,
    sections: [
      {
        title: "Profile",
        rows: [
          { label: "Basic profile listing", check: true },
          { label: "Portfolio items", value: "3 items" },
          { label: "Verified badge", check: false },
          { label: "Performance stats for brands", check: true },
        ]
      },
      {
        title: "Visibility",
        rows: [
          { label: "Standard search placement", check: true },
          { label: "Featured in platform sections", check: false },
          { label: "Homepage featured placement", check: false },
          { label: "Priority search placement", check: false },
        ]
      },
      {
        title: "Campaigns",
        rows: [
          { label: "Apply to brand campaigns", check: true },
          { label: "Early access to new briefs", check: false },
          { label: "Direct message brands", check: false },
        ]
      },
      {
        title: "Extras",
        rows: [
          { label: "Referral rewards program", check: true },
          { label: "Profile analytics", check: false },
          { label: "Open to work badge", check: false },
        ]
      },
    ]
  },
  {
    id: "rising", name: "Rising", price: 9,
    fee: "10%", feeNote: "commission",
    tagline: "Active creators building an audience",
    badge: null,
    sections: [
      {
        title: "Profile",
        rows: [
          { label: "Verified badge included", check: true },
          { label: "Portfolio items", value: "10 items" },
          { label: "Performance stats for brands", check: true },
          { label: "Profile analytics", check: true },
        ]
      },
      {
        title: "Visibility",
        rows: [
          { label: "Boosted search placement", check: true },
          { label: "Featured in 1 platform section", value: "1 section" },
          { label: "Homepage featured placement", check: false },
          { label: "Priority search placement", check: false },
        ]
      },
      {
        title: "Campaigns",
        rows: [
          { label: "Apply to brand campaigns", check: true },
          { label: "Early access to new briefs", check: true },
          { label: "Direct message brands", check: true },
        ]
      },
      {
        title: "Extras",
        rows: [
          { label: "Referral rewards program", check: true },
          { label: "Profile analytics", check: true },
          { label: "Open to work badge", check: true },
        ]
      },
    ]
  },
  {
    id: "creatorPro", name: "Pro Creator", price: 19,
    fee: "7%", feeNote: "commission",
    tagline: "Maximise your brand deal earnings",
    badge: "Best Value",
    sections: [
      {
        title: "Profile",
        rows: [
          { label: "Verified badge included", check: true },
          { label: "Portfolio items", value: "Unlimited" },
          { label: "Performance stats for brands", check: true },
          { label: "Profile analytics (who viewed you)", check: true },
        ]
      },
      {
        title: "Visibility",
        rows: [
          { label: "Priority search placement", check: true },
          { label: "Featured across ALL sections", check: true },
          { label: "Homepage featured placement", check: true },
          { label: "Open to work badge", check: true },
        ]
      },
      {
        title: "Campaigns",
        rows: [
          { label: "Apply to brand campaigns", check: true },
          { label: "Early access to new briefs", check: true },
          { label: "Direct message brands first", check: true },
        ]
      },
      {
        title: "Extras",
        rows: [
          { label: "Referral rewards program", check: true },
          { label: "Onboarding session", check: true },
          { label: "Quarterly strategy review", check: true },
        ]
      },
    ]
  },
];

// ─── REFERRAL DATA ────────────────────────────────────────
const REFERRALS = {
  creator: [
    { tier: "Free", action: "Refer 1 creator", reward: "Commission → 12% for 6 months" },
    { tier: "Free", action: "Refer 5 creators", reward: "Verified badge unlocked for 30 days" },
    { tier: "Free", action: "Refer 10 creators", reward: "Permanent commission → 10%" },
    { tier: "Free", action: "Refer a brand (any tier)", reward: "7-day featured placement free" },
    { tier: "Rising", action: "Refer a creator who upgrades", reward: "$5 account credit" },
    { tier: "Rising", action: "Refer a brand (any tier)", reward: "$15 account credit" },
    { tier: "Pro", action: "Refer a creator who upgrades", reward: "$10 account credit" },
    { tier: "Pro", action: "Refer a brand (any tier)", reward: "$15 credit + analytics bonus month" },
  ],
  brand: [
    { tier: "Free", action: "Refer a brand (any tier)", reward: "Service fee −1% for 30 days" },
    { tier: "Free", action: "Refer 3 brands", reward: "Basic analytics unlocked for 30 days" },
    { tier: "Free", action: "Refer a creator", reward: "1 free 3-Day Boost credit" },
    { tier: "Free", action: "Refer 5 total users", reward: "Permanent service fee → 10%" },
    { tier: "Starter", action: "Refer a brand on Starter", reward: "$20 account credit" },
    { tier: "Starter", action: "Refer a brand on Pro", reward: "$40 account credit" },
    { tier: "Pro", action: "Refer a brand on Pro", reward: "$40 credit + 1 free boost" },
    { tier: "Premium", action: "Refer a brand on Premium", reward: "$80–120 credit + account manager session" },
    { tier: "Agency", action: "Refer an agency", reward: "$150 credit + co-marketing feature" },
  ]
};

// ─── PLAN CARD ────────────────────────────────────────────
function PlanCard({ plan, billing, onSubscribe }) {
  const isPopular = plan.badge === "Most Popular" || plan.badge === "Best Value";
  const isAgency = plan.id === "agency";

  const moPrice = plan.price;
  const yrMoPrice = moPrice > 0 ? Math.round(moPrice * 10) : 0;
  const showPrice = billing === "yearly" && moPrice > 0 ? yrMoPrice : moPrice;
  const saving = moPrice * 2;

  return (
    <div className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col flex-1 min-w-[220px] max-w-[240px] ${isPopular ? 'border-2 border-primary' : 'border border-gray-200'}`}>
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-dark text-white px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase">
          {plan.badge}
        </div>
      )}

      {/* Plan name + tagline */}
      <div className="mb-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{plan.tagline}</p>
        <h3 className="text-lg font-bold text-dark">{plan.name}</h3>
      </div>

      {/* Price */}
      <div className="mb-3">
        {moPrice === 0 ? (
          <div className="text-3xl font-black text-dark">Free</div>
        ) : (
          <>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-gray-600">$</span>
              <span className="text-3xl font-black text-dark">{showPrice}</span>
              <span className="text-[11px] text-gray-600 ml-1">
                {billing === "yearly" ? "/mo billed yearly" : "/mo"}
              </span>
            </div>
            {billing === "yearly" && (
              <div className="text-[10px] text-green-600 font-semibold mt-0.5">
                You save ${saving}/yr
              </div>
            )}
          </>
        )}

        {/* Fee chip */}
        <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1 mt-2">
          <span className="text-xs font-bold text-dark">{plan.fee}</span>
          <span className="text-[10px] text-gray-600">{plan.feeNote}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 mb-3" />

      {/* Features by section */}
      <div className="flex-1 flex flex-col gap-3 mb-4">
        {plan.sections.map((sec, si) => (
          <div key={si}>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">{sec.title}</p>
            <div className="flex flex-col gap-1.5">
              {sec.rows.map((row, ri) => (
                <div key={ri} className="flex items-center gap-1.5" style={{ opacity: row.check === false ? 0.4 : 1 }}>
                  {row.check === true && (
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {row.check === false && (
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {row.value !== undefined && (
                    <span className="text-[10px] font-semibold text-dark bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {row.value}
                    </span>
                  )}
                  <span className="text-xs text-gray-700 leading-tight">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSubscribe(plan.id)}
        className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all ${
          isPopular
            ? 'bg-primary hover:bg-primary-dark text-dark'
            : isAgency
            ? 'bg-dark hover:bg-gray-800 text-white'
            : 'border-2 border-gray-300 hover:border-dark text-dark hover:bg-gray-50'
        }`}
      >
        {moPrice === 0 ? "Get Started — Free" : plan.id === "agency" ? "Contact Sales" : "Subscribe Now"}
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────
export default function Pricing() {
  const [side, setSide] = useState("brand");
  const [billing, setBilling] = useState("monthly");
  const [refSide, setRefSide] = useState("creator");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const plans = side === "brand" ? BRAND : CREATOR;
  const referrals = REFERRALS[refSide];

  const handleSubscribe = (planId) => {
    if (!isAuthenticated) {
      toast.error("Please log in to subscribe");
      navigate("/login");
      return;
    }
    navigate("/subscription/manage", { state: { selectedPlanId: planId, billingCycle: billing } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="pt-20 pb-16 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-dark">
            Pricing that grows with you
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
            Start free. Pay less as you upgrade. Africa's creator-brand collaboration platform.
          </p>

          {/* Tabs: Brand / Creator */}
          <div className="inline-flex bg-white rounded-full shadow-sm p-1 mb-8">
            {[["brand", "🏢 For Brands"], ["creator", "🎨 For Creators"]].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setSide(val)}
                className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${
                  side === val ? 'bg-primary text-dark' : 'text-gray-600 hover:text-dark'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-semibold ${billing === "monthly" ? 'text-dark' : 'text-gray-500'}`}>Monthly</span>
            <button
              onClick={() => setBilling(b => b === "monthly" ? "yearly" : "monthly")}
              className={`relative w-12 h-6 rounded-full transition-colors ${billing === "yearly" ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${billing === "yearly" ? 'left-6' : 'left-0.5'}`} />
            </button>
            <span className={`text-sm font-semibold ${billing === "yearly" ? 'text-dark' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-2 text-xs text-green-600">2 months free</span>
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PLAN CARDS
      ══════════════════════════════════════════ */}
      <section className="pb-16 px-6 lg:px-12 xl:px-20">
        <div className="w-full mx-auto">
          {/* Brand plans: horizontal scroll on all screens */}
          {side === "brand" ? (
            <div className="overflow-x-auto pb-4 pt-4">
              <div className="flex gap-6 min-w-max px-4 mx-auto" style={{ width: 'fit-content' }}>
                {plans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} billing={billing} onSubscribe={handleSubscribe} />
                ))}
              </div>
            </div>
          ) : (
            /* Creator plans: normal wrap behavior */
            <div className="flex gap-6 justify-center flex-wrap max-w-7xl mx-auto pt-4">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} billing={billing} onSubscribe={handleSubscribe} />
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-500 mt-8 max-w-3xl mx-auto">
            {side === "brand"
              ? "Service fee applied to all creator payouts · Yearly plans billed upfront · Cancel anytime"
              : "Commission deducted from brand deal earnings · Yearly plans billed upfront · Cancel anytime"}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          AGENCY SPOTLIGHT (Brand only)
      ══════════════════════════════════════════ */}
      {side === "brand" && (
        <section className="pb-16 px-6 lg:px-12 xl:px-20">
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-3xl p-8 lg:p-12 flex gap-8 items-center flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <p className="text-xs text-orange-600 uppercase tracking-wide font-semibold mb-3">
                  Agency Plan · $399/mo
                </p>
                <h3 className="text-2xl font-bold mb-3 text-dark">
                  Managing campaigns for multiple clients?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  One platform for all your clients. Separate dashboards, white-label reports with your agency branding, 10 team members, and the platform's lowest service fee at 2%.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["10 client workspaces", "White-label reports", "10 team members", "+$30/extra workspace", "2% service fee", "Dedicated account manager"].map(f => (
                    <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-white text-orange-700 font-medium border border-orange-200">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-5xl font-black text-orange-600 mb-2">$399</div>
                <p className="text-sm text-gray-600 mb-6">per month</p>
                <button
                  onClick={() => handleSubscribe("agency")}
                  className="px-8 py-3 rounded-full bg-dark hover:bg-gray-800 text-white font-semibold transition-colors"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          SPOTLIGHT BOOST
      ══════════════════════════════════════════ */}
      <section className="py-16 px-6 lg:px-12 xl:px-20 border-t border-gray-200">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Add-On · Available on all tiers</p>
            <h2 className="text-3xl font-bold mb-3 text-dark">⚡ Spotlight Boost</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Need more visibility right now? Boost your profile or campaign across the homepage and all platform sections — no subscription required.
            </p>
          </div>

          <div className="flex gap-6 justify-center flex-wrap">
            {[
              { days: "3 Days", price: 3, icon: "🌱", note: "Quick push", best: false },
              { days: "7 Days", price: 6, icon: "⚡", note: "Standard boost", best: true },
              { days: "30 Days", price: 18, icon: "🔥", note: "Sustained presence", best: false },
            ].map((b, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[200px] max-w-[240px] text-center rounded-3xl p-8 relative transition-all hover:shadow-md ${
                  b.best ? 'bg-primary/10 border-2 border-primary' : 'bg-white border border-gray-200'
                }`}
              >
                {b.best && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-dark text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Best Deal
                  </div>
                )}
                <div className="text-4xl mb-3">{b.icon}</div>
                <div className="text-3xl font-black text-dark mb-2">${b.price}</div>
                <div className="text-lg font-bold text-dark mb-1">{b.days}</div>
                <div className="text-sm text-gray-600">{b.note}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">
            Includes: Homepage placement · Priority badge · All platform sections · Brands & Creators
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          REFERRAL PROGRAM
      ══════════════════════════════════════════ */}
      <section className="py-16 px-6 lg:px-12 xl:px-20 border-t border-gray-200">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Referral Program</p>
            <h2 className="text-3xl font-bold mb-3 text-dark">🤝 Refer friends. Earn rewards.</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Every tier earns something — even the free tier. Refer your network and unlock lower fees, badges, and credits.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white rounded-full shadow-sm p-1">
              {[["creator", "🎨 Creator Referrals"], ["brand", "🏢 Brand Referrals"]].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setRefSide(val)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                    refSide === val ? 'bg-primary text-dark' : 'text-gray-600 hover:text-dark'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Referral rows */}
          <div className="space-y-3">
            {referrals.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600 min-w-[80px]">{r.tier}</span>
                <span className="w-px h-5 bg-gray-200" />
                <span className="flex-1 text-sm text-gray-700 min-w-[200px]">{r.action}</span>
                <span className="text-sm font-bold text-primary">→ {r.reward}</span>
              </div>
            ))}
          </div>

          {/* Stacking note for creators */}
          {refSide === "creator" && (
            <div className="mt-6 p-6 bg-primary/10 border border-primary/30 rounded-2xl flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">💡</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong className="text-dark">Rewards stack.</strong> Refer 1 creator → 12% commission for 6 months. Refer 5 → verified badge for 30 days. Refer 10 → permanent 10% commission. All three apply simultaneously. Referred users must stay active for 30 days before rewards are credited.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BRAND COMPARISON TABLE
      ══════════════════════════════════════════ */}
      {side === "brand" && (
        <section className="py-16 px-6 lg:px-12 xl:px-20 border-t border-gray-200">
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Compare Plans</p>
              <h2 className="text-3xl font-bold mb-3 text-dark">Full Feature Breakdown</h2>
              <p className="text-gray-600">Everything side by side so you can pick the right plan with confidence.</p>
            </div>

            <div className="overflow-x-auto bg-white rounded-3xl border border-gray-200">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-4 text-left text-xs uppercase tracking-wide text-gray-600 font-semibold">Feature</th>
                    {BRAND.map(p => (
                      <th key={p.id} className={`p-4 text-center text-sm font-bold ${p.id === "pro" ? 'bg-primary/10' : ''}`}>
                        <div className="text-dark">{p.name}</div>
                        {p.id === "pro" && <div className="text-xs text-primary uppercase tracking-wide mt-1">Popular</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Price / month", "$0", "$29", "$89", "$199", "$399"],
                    ["Service fee", "12%", "8%", "6%", "3%", "2%"],
                    ["Active campaigns", "1", "3", "10", "Unlimited", "Unlimited"],
                    ["Active collaborations", "3", "10", "30", "Unlimited", "Unlimited"],
                    ["Team members", "1", "2", "3", "5", "10"],
                    ["Creator lists", "3", "10", "Unlimited", "Unlimited", "Unlimited"],
                    ["Client workspaces", "—", "—", "—", "1", "10 incl."],
                    ["Analytics dashboard", "—", "Basic", "Full", "Full", "Full"],
                    ["Engagement trends", "—", "—", "✓", "✓", "✓"],
                    ["Exportable reports", "—", "—", "✓", "✓", "✓"],
                    ["White-label reports", "—", "—", "—", "—", "✓"],
                    ["Sentiment analysis", "—", "—", "Basic", "Full", "Full"],
                    ["Brand mentions", "—", "—", "—", "✓", "✓"],
                    ["Audience overlap", "—", "—", "—", "✓", "✓"],
                    ["Fake follower check", "—", "—", "—", "✓", "✓"],
                    ["Multi-brand workspace", "—", "—", "—", "✓", "✓"],
                    ["Priority support", "—", "—", "—", "✓", "Dedicated"],
                    ["Onboarding call", "—", "—", "—", "✓", "✓"],
                    ["Quarterly review", "—", "—", "—", "✓", "✓"],
                  ].map(([label, ...vals], ri) => (
                    <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="p-4 text-sm text-gray-700">{label}</td>
                      {vals.map((v, vi) => {
                        const isPro = vi === 2;
                        const empty = v === "—";
                        const check = v === "✓";
                        return (
                          <td key={vi} className={`p-4 text-center text-sm ${isPro ? 'bg-primary/5' : ''} ${empty ? 'text-gray-300' : 'text-dark font-semibold'}`}>
                            {check ? (
                              <div className="flex justify-center">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <section className="py-8 px-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          All prices in USD · Yearly plans billed as one payment · Cancel anytime<br />
          BantuBuzz · Africa's Creator-Brand Collaboration Platform
        </p>
      </section>

      <Footer />
    </div>
  );
}
