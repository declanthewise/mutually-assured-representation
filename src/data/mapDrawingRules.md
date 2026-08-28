# Who holds the pen

Per-state notes behind three fields in `stateData.ts`: `independentCommission`, `governorCanVeto`
and `hasBallotInitiative`. The app reads them as plain booleans — the box header draws the last two
as marks and nothing reads the first. The reasoning lives here rather than in the data file, because
every state's rules differ in detail and the data file only needs the verdict.

Everything below is about **congressional** maps. Several states draw their state legislative lines
by an entirely different route — Florida, Maryland and Mississippi all pass legislative maps by joint
resolution the governor never sees, while their congressional maps are ordinary bills he signs or
vetoes — and conflating the two is the most common way to get this wrong.

## The three tests

**`independentCommission`** — does a commission hold the pen outright? True only where an elected
branch cannot override or ignore it. Politician commissions, advisory commissions and legislature-drawn
maps are all false, because in every one of those elected officials still decide. It tracks the map in
force for 2026, not the standing rule. **Six states**: AZ, CO, ID, MI, MT, WA.

**`governorCanVeto`** — is the governor a real check on the map? Two conditions, both required:

1. The congressional plan reaches the governor's desk at all. It doesn't in eleven states: nine where
   a commission draws and the governor is outside the process (AZ, CO, HI, ID, MI, MT, NJ, VA, WA),
   two where the legislature draws but the plan is never presented (CT, NC), and California, where the
   map is written into the constitution itself until 2031.
2. Overriding that veto takes **more than a simple majority**. In six states it doesn't — Alabama,
   Arkansas, Indiana, Kentucky, Tennessee and West Virginia all override on a majority of the elected
   members of each chamber, which is the same margin that passed the map in the first place. A veto
   there is a delay, not a check.

**32 states true, 18 false.**

**`hasBallotInitiative`** — can citizens put a change to the map-making process on the ballot? Not
merely "does the state have some form of direct democracy": the measure has to be able to reach
redistricting.

Twenty-six states have no citizen initiative at all. Maryland and New Mexico have only the popular
referendum, which lets voters strike a law the legislature passed but not propose one. Of the
twenty-four states that do have an initiative, three are struck out: Illinois, whose initiative is
confined by Art. XIV §3 to "structural and procedural subjects" of Art. IV and so cannot reach
congressional redistricting, which does not appear in that article; Mississippi, whose process has
been void since 2021 and is not back; and Alaska, which allows initiated statutes only while its
Redistricting Board, its criteria and its single at-large seat are all constitutional, leaving no
statute to write.

**21 states true, 29 false.**

Five of the twenty-one allow initiated statutes but not initiated amendments — Idaho, Maine, Utah,
Washington and Wyoming. They still count, because in each the part of map-making that binds is
statutory: Idaho's and Washington's commissions sit in their constitutions but the criteria those
commissions must obey are in the code (I.C. §72-1506, RCW 44.05.090), Maine's whole congressional
process is a statute (21-A M.R.S. §1206), and Utah's Prop 4 rewrote map-drawing by statute and
survived the legislature's attempt to repeal it.

---

## Summary

`C` = independent commission, `V` = governor's veto counts, `I` = initiative can reach map-making.

| | State | Congressional map drawn by | Governor | Override | Initiative | C | V | I |
|---|---|---|---|---|---|---|---|---|
| AL | Alabama | Legislature, by statute | signs | majority elected | none | · | · | · |
| AK | Alaska | *one at-large seat* | signs | 2/3 | statute only | · | ✓ | · |
| AZ | Arizona | Independent Redistricting Commission | out | — | amendment | ✓ | · | ✓ |
| AR | Arkansas | Legislature, by statute | signs | majority elected | amendment | · | · | ✓ |
| CA | California | Prop 50 map, in the constitution to 2031 | out | — | amendment | · | · | ✓ |
| CO | Colorado | Independent Congressional Redistricting Commission | out | — | amendment | ✓ | · | ✓ |
| CT | Connecticut | Legislature, 2/3, not presented | out | — | none | · | · | · |
| DE | Delaware | *one at-large seat* | signs | 3/5 | none | · | ✓ | · |
| FL | Florida | Legislature, by statute | signs | 2/3 | amendment | · | ✓ | ✓ |
| GA | Georgia | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| HI | Hawaii | Reapportionment Commission | out | — | none | · | · | · |
| ID | Idaho | Commission for Reapportionment | out | — | statute only | ✓ | · | ✓ |
| IL | Illinois | Legislature, by statute | signs | 3/5 | amendment, barred | · | ✓ | · |
| IN | Indiana | Legislature, by statute | signs | majority elected | none | · | · | · |
| IA | Iowa | Legislature, on LSA drafts | signs | 2/3 | none | · | ✓ | · |
| KS | Kansas | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| KY | Kentucky | Legislature, by statute | signs | majority elected | none | · | · | · |
| LA | Louisiana | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| ME | Maine | Legislature, 2/3, on commission draft | signs | 2/3 | statute only | · | ✓ | ✓ |
| MD | Maryland | Legislature, by statute | signs | 3/5 | referendum only | · | ✓ | · |
| MA | Massachusetts | Legislature, by statute | signs | 2/3 | amendment | · | ✓ | ✓ |
| MI | Michigan | Independent Citizens Redistricting Commission | out | — | amendment | ✓ | · | ✓ |
| MN | Minnesota | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| MS | Mississippi | Legislature, by statute | signs | 2/3 | void since 2021 | · | ✓ | · |
| MO | Missouri | Legislature, by statute | signs | 2/3 | amendment | · | ✓ | ✓ |
| MT | Montana | Districting and Apportionment Commission | out | — | amendment | ✓ | · | ✓ |
| NE | Nebraska | Legislature (unicameral), by statute | signs | 3/5 | amendment | · | ✓ | ✓ |
| NV | Nevada | Legislature, by statute | signs | 2/3 | amendment | · | ✓ | ✓ |
| NH | New Hampshire | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| NJ | New Jersey | New Jersey Redistricting Commission | out | — | none | · | · | · |
| NM | New Mexico | Legislature, by statute | signs | 2/3 | referendum only | · | ✓ | · |
| NY | New York | Legislature, on IRC drafts | signs | 2/3 | none | · | ✓ | · |
| NC | North Carolina | Legislature; exempt from veto | out | — | none | · | · | · |
| ND | North Dakota | *one at-large seat* | signs | 2/3 | amendment | · | ✓ | ✓ |
| OH | Ohio | Legislature 3/5, else the Redistricting Commission | signs | 3/5 | amendment | · | ✓ | ✓ |
| OK | Oklahoma | Legislature, by statute | signs | 2/3 | amendment | · | ✓ | ✓ |
| OR | Oregon | Legislature, by statute | signs | 2/3 | amendment | · | ✓ | ✓ |
| PA | Pennsylvania | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| RI | Rhode Island | Legislature, on commission drafts | signs | 3/5 | none | · | ✓ | · |
| SC | South Carolina | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| SD | South Dakota | *one at-large seat* | signs | 2/3 | amendment | · | ✓ | ✓ |
| TN | Tennessee | Legislature, by statute | signs | majority elected | none | · | · | · |
| TX | Texas | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| UT | Utah | Legislature, by statute | signs | 2/3 | statute only | · | ✓ | ✓ |
| VT | Vermont | *one at-large seat* | signs | 2/3 | none | · | ✓ | · |
| VA | Virginia | Virginia Redistricting Commission | out | — | none | · | · | · |
| WA | Washington | Washington State Redistricting Commission | out | — | statute only | ✓ | · | ✓ |
| WV | West Virginia | Legislature, by statute | signs | majority elected | none | · | · | · |
| WI | Wisconsin | Legislature, by statute | signs | 2/3 | none | · | ✓ | · |
| WY | Wyoming | *one at-large seat* | signs | 2/3 | statute only | · | ✓ | ✓ |

The six states marked *one at-large seat* have no congressional map to draw, so both marks are moot;
they are recorded by the rule that would apply and never render, since neither board seats a
single-district state.

---

## State by state

**Alabama.** Congressional lines pass as an ordinary bill. Either chamber overrides a veto with a
majority of its elected members, so the veto costs the legislature nothing. No initiative. The map in
force is the legislature's own, after the Supreme Court lifted the injunction against it in June 2026.

**Alaska.** One at-large seat: there is nothing to district. The Alaska Redistricting Board draws
state legislative lines only, and both the Board and its criteria are in Art. VI of the constitution.
Alaska's initiative reaches statutes only, so there is no citizen route to any of it.

**Arizona.** The Independent Redistricting Commission holds the pen; the governor has no part. The
commission itself was created by citizen initiative — Prop 106 in 2000 — which is the clearest
demonstration there is that Arizona's initiative can reach map-making.

**Arkansas.** The Board of Apportionment draws state legislative lines; congressional lines are a
statute of the General Assembly. Override is a majority of the elected members, so the veto is not a
check. Arkansas has both initiated amendments and initiated statutes; a 2026 attempt to create an
independent commission died in committee, but by the legislature's hand, not the rule's.

**California.** Normally the Citizens Redistricting Commission draws. Prop 50, passed 64–36 in
November 2025, suspended that for three cycles by writing a specific legislature-drawn map into
Art. XXI itself, to be used in 2026, 2028 and 2030, with the commission resuming in 2031. So the
current map is neither the commission's nor a bill: there is nothing on the governor's desk, and
changing it before 2031 means going back to the ballot. Which citizens can do — Props 11 and 20, the
measures that created the commission, were initiatives.

**Colorado.** An independent commission draws, with the state Supreme Court reviewing. The governor
is out. Initiated amendments are available.

**Connecticut.** The General Assembly adopts congressional lines by two-thirds of each chamber, and
the plan is not presented to the governor; a nine-member backup commission takes over if the deadline
passes. No initiative of any kind.

**Delaware.** One at-large seat. Redistricting is a bill, override 3/5. No initiative.

**Florida.** Congressional lines are an ordinary bill — DeSantis vetoed the legislature's map in March
2022 and forced a special session, which is the plainest proof the veto is real here. Override is 2/3.
The state legislative maps, by contrast, go by joint resolution the governor never sees. Florida's
initiative produces constitutional amendments, and the 2010 Fair Districts amendments were citizen
initiatives that bind congressional map-drawing directly.

**Georgia.** Legislature by statute, override 2/3. No initiative.

**Hawaii.** The Reapportionment Commission draws both congressional and legislative lines; eight of its
nine members are named by legislative leaders, so it is a politician commission rather than an
independent one, but the governor is outside it either way. No statewide initiative.

**Idaho.** The Commission for Reapportionment holds the pen and the governor has no role. Idaho's
initiative makes statutes only, and the commission sits in Art. III §2 of the constitution — but the
criteria it must follow are statutory (I.C. §72-1506), so citizens can bind how the map is drawn even
though they cannot replace who draws it.

**Illinois.** Legislature by statute, override 3/5 — so the veto counts. The initiative does not.
Art. XIV §3 confines citizen amendments to "structural and procedural subjects contained in Article
IV," and congressional redistricting is not in Art. IV at all. The Illinois Supreme Court struck the
Independent Map Amendment from the 2016 ballot on that ground after it had qualified on signatures.

**Indiana.** Legislature by statute, with a backup commission if it deadlocks. Override is a majority
of the elected members. No initiative. The 2025–26 push to redraw failed for want of votes, not for
want of a governor's signature.

**Iowa.** The nonpartisan Legislative Services Agency drafts and the legislature votes the plan up or
down without amendment; it is still a bill, and the governor still signs it. Override 2/3. No
initiative.

**Kansas.** Legislature by statute, override 2/3. Governor Kelly's veto is exactly why Kansas did not
redraw in 2026 — the Republican leadership could not find the two-thirds. No initiative.

**Kentucky.** Legislature by statute, override a majority of the elected members. No initiative.

**Louisiana.** Legislature by statute, override 2/3. No initiative.

**Maine.** A fifteen-member advisory commission proposes and the legislature enacts by two-thirds of
each house under 21-A M.R.S. §1206, subject to the governor's approval. The veto is formally real and
practically weak: any plan that can pass already carries the margin that overrides. Maine's initiative
makes statutes, and §1206 is a statute, so the citizen route reaches the process.

**Maryland.** The governor submits a plan and the legislature may substitute its own; congressional
lines pass as a bill. Hogan vetoed the 2021 congressional map and was overridden the same day, but 3/5
is a real bar. Maryland has the popular referendum only — voters can strike a law, not propose one —
so there is no initiative route.

**Massachusetts.** Legislature by statute, override 2/3. The initiative is indirect and reaches both
statutes and amendments; redistricting is not among the subjects Art. 48 excludes.

**Michigan.** The Independent Citizens Redistricting Commission draws, created by the 2018 citizen
amendment. The governor is out.

**Minnesota.** Legislature by statute, override 2/3. Divided government has meant courts have drawn
every map since 1970, but the statutory route and its veto are what stand behind that. No initiative.

**Mississippi.** Congressional lines are a statute — HB 384, signed January 2022 — while legislative
lines go by joint resolution. Override 2/3. The initiative process has been void since the state
Supreme Court's May 2021 ruling that the signature-distribution rule became impossible after the 2001
reapportionment, and the fifth attempt to restore it failed in February 2026.

**Missouri.** Its two apportionment commissions draw state legislative lines only; congressional lines
are a statute, and Governor Kehoe signed the 2025 mid-decade map. Override 2/3. Initiated amendments
are available and have been used on redistricting — Clean Missouri, 2018.

**Montana.** The Districting and Apportionment Commission draws; the governor is out. Both kinds of
initiative are available.

**Nebraska.** Unicameral, so one chamber passes the bill and the governor signs it; override 3/5.
Officially nonpartisan. Both kinds of initiative.

**Nevada.** Legislature by statute, override 2/3. Both kinds of initiative, though Nevada requires a
measure that spends money to name its funding source, which is what sank the 2022 commission
initiative in court — a hurdle rather than a bar.

**New Hampshire.** Legislature by statute, override 2/3; Sununu vetoed the 2022 congressional map. No
initiative.

**New Jersey.** The thirteen-member New Jersey Redistricting Commission draws congressional lines. It
is a politician commission — the parties name twelve of the thirteen — but the governor is outside it.
No initiative.

**New Mexico.** Legislature by statute, on an advisory committee's drafts; override 2/3. Popular
referendum only, so no initiative route.

**New York.** The Independent Redistricting Commission proposes, but the legislature may reject its
plans and draw its own, and what results is a law the governor signs. Override 2/3. No initiative.

**North Carolina.** The General Assembly draws, and redistricting bills are exempt from the governor's
veto by N.C. Const. Art. II §22(5) — a carve-out written into the 1996 amendment that gave the
governor a veto in the first place. No initiative.

**North Dakota.** One at-large seat. Both kinds of initiative.

**Ohio.** Art. XIX gives the General Assembly first refusal: a plan passed as a bill by three-fifths
of each chamber including half the minority party, which the governor signs — DeWine signed S.B. 258
in 2021 — with a 3/5 override. If that fails, the Ohio Redistricting Commission adopts a plan instead,
and the governor sits on that commission as one of seven votes rather than holding a veto over it. The
map in force came that second way, adopted unanimously by the commission in October 2025. The veto is
recorded as real because the primary route is a bill. Initiated amendments are available and have been
aimed at exactly this: Issue 1 in 2024, which failed at the polls.

**Oklahoma.** Legislature by statute with a backup commission, override 2/3. Both kinds of initiative;
SQ 810 in 2021 was a redistricting commission attempt.

**Oregon.** Legislature by statute, override 2/3. Both kinds of initiative.

**Pennsylvania.** Legislature by statute, override 2/3. Wolf's refusal to sign in 2021 is what sent the
congressional map to the state Supreme Court. No initiative — Pennsylvania is the largest state with
neither initiative nor referendum.

**Rhode Island.** An advisory commission drafts and the legislature enacts by statute; the governor
signs, override 3/5. No initiative.

**South Carolina.** Legislature by statute, override 2/3. No initiative. The 2026 attempt to redraw
died on a two-thirds vote in the Senate.

**South Dakota.** One at-large seat. Both kinds of initiative.

**Tennessee.** Legislature by statute, override a majority of the elected members — Governor Lee
signed the 2026 mid-decade map, but a veto would not have stopped it. No initiative.

**Texas.** Legislature by statute, override 2/3; Abbott signed the 2025 mid-decade map. No initiative.

**Utah.** Legislature by statute, override 2/3; the Utah Independent Redistricting Commission is
advisory. The initiative makes statutes only, and that has been enough: Prop 4 in 2018 rewrote the
process, the legislature repealed and replaced it, and in 2024 the state Supreme Court held in
*League of Women Voters v. Utah Legislature* that it could not simply undo a government-reform
initiative. A district court imposed the current congressional map in November 2025 under Prop 4's
standards.

**Vermont.** One at-large seat. No initiative.

**Virginia.** The Virginia Redistricting Commission — eight legislators and eight citizens, so a
politician commission — draws congressional lines, with the Supreme Court of Virginia as the backstop
when it deadlocks, which is what happened in 2021. The governor has no role. The April 2026 referendum
that would have handed congressional map-drawing back to the legislature through 2030 passed narrowly
and was struck down by that same court on 8 May 2026 for how it moved through the legislature, so the
commission's authority stands. Virginia has no initiative; the 2020 and 2026 amendments were both
legislative referrals.

**Washington.** The Washington State Redistricting Commission draws under Art. II §43; the legislature
may amend its plan by two-thirds but the plan never goes to the governor. The initiative makes statutes
only, and the commission is constitutional — but its binding criteria, including the bar on drawing to
favor a party, are in RCW 44.05.090, which an initiative can rewrite.

**West Virginia.** Legislature by statute, override a majority of the elected members. No initiative.

**Wisconsin.** Legislature by statute, override 2/3 — Evers vetoed the 2021 maps and the state Supreme
Court drew instead, which is the veto working. No initiative.

**Wyoming.** One at-large seat, set by statute. The initiative makes statutes, so the rule would reach
it if there were anything to reach.

---

## Sources

- Veto override thresholds: [NCSL, Veto Overrides and Supermajorities](https://www.ncsl.org/center-for-legislative-strengthening/veto-overrides-and-supermajorities)
  and [Ballotpedia, Veto overrides in state legislatures](https://ballotpedia.org/Veto_overrides_in_state_legislatures).
  Thirty-six states at two-thirds, seven at three-fifths (DE, IL, MD, NE, NC, OH, RI), six at a
  majority of the elected members (AL, AR, IN, KY, TN, WV).
- Who draws the lines: [All About Redistricting, Loyola Law School](https://redistricting.lls.edu/redistricting-101/who-draws-the-lines/)
  and the per-state pages under `redistricting.lls.edu/state/`. Note that its list of five states
  drawing "by joint resolution, without the potential for a gubernatorial veto" is about state
  legislative lines; Florida, Maryland and Mississippi all pass congressional maps as bills.
- [Brennan Center, National Overview of Redistricting](https://www.brennancenter.org/our-work/research-reports/national-overview-redistricting-who-draws-lines).
- Initiative and referendum rights: [Initiatives and referendums in the United States](https://en.wikipedia.org/wiki/Initiatives_and_referendums_in_the_United_States).
- California: [LAO analysis of Proposition 50](https://lao.ca.gov/BallotAnalysis/Proposition?number=50&year=2025).
- Virginia: [2026 Virginia redistricting referendum](https://en.wikipedia.org/wiki/2026_Virginia_redistricting_referendum).
- Mississippi: [Push to restore Mississippi voters' right to ballot initiative fizzles again](https://mississippitoday.org/2026/02/11/mississippi-ballot-initiative-2/), February 2026.
- Illinois: [Hooker v. Illinois State Board of Elections](https://caselaw.findlaw.com/il-supreme-court/1749727.html), 2016 IL 121077.

Checked August 2026. Branch control in `stateData.ts` dates faster than any of this — the rules here
move by constitutional amendment, not by election — but California's Prop 50 window closes in 2031 and
Mississippi's initiative could come back in any session.
