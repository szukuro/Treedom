/**
 * Example: "Are we the right partner for you?"
 *
 * A hypothetical IT services company (Kestrel Digital) that builds and runs web
 * and mobile platforms for upper-mid to extra-large organisations: architecture
 * consulting, DevOps, development and testing. Small businesses that just need a
 * website are pointed to WordPress/Webflow/Shopify, but can still book ad-hoc
 * consultations.
 *
 * Things worth noticing in this tree:
 * - The order of questions depends on intent: "build" asks *what* first, then
 *   size; "improve" and "advice" ask size first. The "explore" branch asks size
 *   and then jumps into one of the other branches, which skip the size question
 *   because `visited size` is already true.
 * - `pains` loops back to itself; options already picked are hidden (`showIf`),
 *   "That's everything" only appears after the first pick, and after three picks
 *   the node moves on by itself.
 * - `build_router` and `evaluate` are invisible router nodes that decide purely
 *   on accumulated state (size, budget, complexity, fit and need_* counters).
 * - Some outcomes still offer choices that change state and re-enter the tree.
 *
 * The tree is written with small helper functions for readability; the result is
 * plain JSON (see `examples/it-services.json`). Hungarian and German texts live
 * in `itServices.translations.ts`.
 */
import type {
  Choice,
  Comparator,
  Condition,
  DecisionTree,
  Effect,
  OutcomeTone,
  Transition,
  TreeNode,
  Variable,
} from '../core/types';
import { SCHEMA_VERSION } from '../core/types';
import { applyTranslations } from './itServices.translations';

// --- tiny DSL -------------------------------------------------------------

const cmp = (key: string, op: Comparator, right: number | string): Condition => ({
  type: 'compare',
  left: { var: key },
  op,
  right: typeof right === 'number' ? right : { var: right },
});
const all = (...conditions: Condition[]): Condition => ({ type: 'all', conditions });
const any = (...conditions: Condition[]): Condition => ({ type: 'any', conditions });
const visited = (node: string): Condition => ({ type: 'visited', node });
const not = (condition: Condition): Condition => ({ type: 'not', condition });

const set = (key: string, value: number): Effect => ({ var: key, op: 'set', value });
const add = (key: string, value: number): Effect => ({ var: key, op: 'add', value });

let tCounter = 0;
const go = (to: string, when?: Condition, label?: string): Transition => ({
  id: `t${++tCounter}`,
  to,
  ...(when ? { when } : {}),
  ...(label ? { label } : {}),
});

const choice = (
  id: string,
  label: string,
  effects: Effect[] = [],
  transitions: Transition[] = [],
  extra: Partial<Choice> = {},
): Choice => ({ id, label, effects, transitions, ...extra });

const question = (id: string, title: string, body: string, choices: Choice[], transitions: Transition[] = []): TreeNode => ({
  id,
  kind: 'question',
  title,
  body,
  onEnter: [],
  choices,
  transitions,
});

const router = (id: string, title: string, transitions: Transition[], notes?: string): TreeNode => ({
  id,
  kind: 'router',
  title,
  body: '',
  onEnter: [],
  choices: [],
  transitions,
  ...(notes ? { notes } : {}),
});

const outcome = (
  id: string,
  title: string,
  tone: OutcomeTone,
  body: string,
  cta?: { label: string; url: string },
  choices: Choice[] = [],
  transitions: Transition[] = [],
): TreeNode => ({
  id,
  kind: 'outcome',
  title,
  body,
  onEnter: [],
  choices,
  transitions,
  outcome: cta ? { tone, cta } : { tone },
});

const flag = (key: string, label: string, description?: string): Variable => ({
  key,
  label,
  initial: 0,
  min: 0,
  max: 1,
  ...(description ? { description } : {}),
});
const counter = (key: string, label: string, description?: string, max?: number): Variable => ({
  key,
  label,
  initial: 0,
  min: 0,
  ...(max !== undefined ? { max } : {}),
  ...(description ? { description } : {}),
});

const CONTACT = 'mailto:hello@kestrel.example?subject=';

// --- the tree -------------------------------------------------------------

export function createItServicesTree(): DecisionTree {
  tCounter = 0;

  const variables: Variable[] = [
    flag('intent_build', 'Wants to build something new'),
    flag('intent_improve', 'Wants to improve an existing system'),
    flag('intent_advice', 'Wants expert advice'),
    counter('size', 'Company size tier', '0 = unknown, 1 = <10 people … 5 = 2000+', 5),
    counter('budget', 'Budget tier', '0 = unknown, 1 = <€15k … 4 = €300k+', 4),
    counter('complexity', 'Solution complexity score'),
    { key: 'fit', label: 'Fit score', description: 'How well the customer matches our sweet spot (can go negative).', initial: 0 },
    flag('web', 'Web platform involved'),
    flag('mobile', 'Mobile platform involved'),
    flag('off_platform', 'Needs something other than web/mobile'),
    flag('has_team', 'Has an in-house dev team'),
    flag('regulated', 'Regulated / high-stakes environment'),
    counter('pains', 'Number of pain points picked', undefined, 5),
    flag('pain_release', 'Pain: slow or risky releases'),
    flag('pain_outage', 'Pain: outages'),
    flag('pain_bugs', 'Pain: bugs reach users'),
    flag('pain_scale', 'Pain: cannot scale'),
    flag('pain_capacity', 'Pain: not enough delivery capacity'),
    counter('need_arch', 'Need: architecture'),
    counter('need_devops', 'Need: DevOps'),
    counter('need_dev', 'Need: development'),
    counter('need_qa', 'Need: testing / QA'),
  ];

  const nodes: TreeNode[] = [
    question(
      'start',
      'What brings you here today?',
      "Answer a few quick questions and we'll tell you honestly whether we are the right partner – or point you somewhere better.",
      [
        choice('build', 'We want to build a new website, portal or app', [set('intent_build', 1)], [go('what_build')]),
        choice('improve', 'We have a system that needs help (delivery speed, stability, quality)', [set('intent_improve', 1)], [go('size')]),
        choice('advice', 'We need expert advice or a second opinion', [set('intent_advice', 1)], [go('size')]),
        choice('explore', 'Just looking around', [], [go('size')]),
      ],
    ),

    question(
      'what_build',
      'What are you planning to build?',
      'Pick the option closest to your plans.',
      [
        choice('brochure', 'A company / presentation website', [set('web', 1), add('complexity', 1)]),
        choice('shop', 'An online shop', [set('web', 1), add('complexity', 2)]),
        choice('portal', 'A customer portal with self-care (accounts, billing, support)', [
          set('web', 1), add('complexity', 5), add('need_arch', 1), add('need_dev', 2), add('fit', 2),
        ]),
        choice('mobile_app', 'A mobile app', [set('mobile', 1), add('complexity', 3), add('need_dev', 2)]),
        choice('omni', 'A web portal plus companion iOS / Android apps', [
          set('web', 1), set('mobile', 1), add('complexity', 7), add('need_arch', 2), add('need_dev', 2), add('fit', 3),
        ]),
        choice('internal', 'An internal enterprise platform (workflows, dashboards, integrations)', [
          set('web', 1), add('complexity', 4), add('need_arch', 1), add('need_dev', 2), add('fit', 1),
        ]),
        choice('desktop', 'Desktop software, embedded or a game', [set('off_platform', 1)], [go('off_platform')]),
      ],
      [go('size', not(visited('size')), 'size not asked yet'), go('build_router')],
    ),

    question(
      'size',
      'How large is your organisation?',
      '',
      [
        choice('s1', 'Fewer than 10 people', [set('size', 1), add('fit', -3)]),
        choice('s2', '10 – 50 people', [set('size', 2), add('fit', -1)]),
        choice('s3', '50 – 250 people', [set('size', 3), add('fit', 2)]),
        choice('s4', '250 – 2,000 people', [set('size', 4), add('fit', 3)]),
        choice('s5', 'More than 2,000 people', [set('size', 5), add('fit', 4)]),
      ],
      [
        go('build_router', cmp('intent_build', 'eq', 1)),
        go('pains', cmp('intent_improve', 'eq', 1)),
        go('advice_topic', cmp('intent_advice', 'eq', 1)),
        go('explore'),
      ],
    ),

    question(
      'explore',
      'What would be most useful to you right now?',
      "No problem – let's see where we could help.",
      [
        choice('x_build', 'Planning a new digital product', [set('intent_build', 1)], [go('what_build')]),
        choice('x_improve', 'Making an existing system faster, more stable or easier to release', [set('intent_improve', 1)], [go('pains')]),
        choice('x_advice', 'Talking to an architect about our technology choices', [set('intent_advice', 1)], [go('advice_topic')]),
        choice('x_curious', 'Honestly, just curious', [], [go('curious')]),
      ],
    ),

    router(
      'build_router',
      'Is this a small-business website?',
      [
        go('diy_site', all(cmp('size', 'lte', 2), cmp('complexity', 'lte', 2)), 'small company, simple site'),
        go('budget', cmp('size', 'lte', 2), 'small company, ambitious product'),
        go('integrations'),
      ],
      'Small companies with a simple website get pointed to off-the-shelf tools straight away.',
    ),

    question(
      'integrations',
      'Does it need to integrate with your existing systems?',
      'Think CRM, ERP, payment providers, single sign-on, legacy back-ends…',
      [
        choice('int_many', 'Yes, several core systems (ERP, CRM, SSO, payments)', [add('complexity', 4), add('need_arch', 2), add('fit', 2)]),
        choice('int_some', 'A handful of third-party services', [add('complexity', 2), add('need_arch', 1)]),
        choice('int_none', "No, it's standalone"),
      ],
      [go('team')],
    ),

    question(
      'team',
      'Do you have your own development team?',
      '',
      [
        choice('team_strong', 'Yes, a strong in-house team – we need specialists to support them', [
          set('has_team', 1), add('need_devops', 1), add('need_qa', 1), add('need_arch', 1),
        ]),
        choice('team_small', 'A small team that needs extra hands', [set('has_team', 1), add('need_dev', 1), add('need_qa', 1)]),
        choice('team_none', 'No, we need a partner to deliver end-to-end', [
          add('need_dev', 2), add('need_qa', 1), add('need_devops', 1), add('fit', 1),
        ]),
      ],
      [
        go('budget', cmp('budget', 'eq', 0), 'budget unknown'),
        go('compliance', all(cmp('size', 'gte', 3), not(visited('compliance')))),
        go('evaluate'),
      ],
    ),

    question(
      'budget',
      'What budget range are you considering?',
      'A rough idea is enough – it helps us suggest the right kind of engagement.',
      [
        choice('b1', 'Under €15k', [set('budget', 1), add('fit', -3)]),
        choice('b2', '€15k – €75k', [set('budget', 2)]),
        choice('b3', '€75k – €300k', [set('budget', 3), add('fit', 2)]),
        choice('b4', 'Over €300k', [set('budget', 4), add('fit', 4)]),
        choice('b_unknown', 'Not defined yet', [set('budget', 2)]),
      ],
      [go('compliance', all(cmp('size', 'gte', 3), not(visited('compliance'))), 'larger company'), go('evaluate')],
    ),

    question(
      'compliance',
      'Do you operate in a regulated or high-stakes environment?',
      'For example finance, healthcare, the public sector – or anywhere downtime costs real money.',
      [
        choice('reg_yes', 'Yes', [set('regulated', 1), add('need_arch', 1), add('need_qa', 1), add('complexity', 2), add('fit', 1)]),
        choice('reg_no', 'No'),
      ],
      [go('evaluate')],
    ),

    question(
      'pains',
      'What is hurting the most?',
      'Pick one at a time – you can add more afterwards. Selected so far: {{pains}}.',
      [
        choice('p_release', 'Releases are slow, manual or scary', [set('pain_release', 1), add('need_devops', 2), add('pains', 1), add('fit', 1)], [], {
          showIf: cmp('pain_release', 'eq', 0),
        }),
        choice('p_outage', 'Outages and production incidents', [set('pain_outage', 1), add('need_devops', 1), add('need_arch', 1), add('pains', 1), add('fit', 1)], [], {
          showIf: cmp('pain_outage', 'eq', 0),
        }),
        choice('p_bugs', 'Too many bugs reach our users', [set('pain_bugs', 1), add('need_qa', 2), add('pains', 1), add('fit', 1)], [], {
          showIf: cmp('pain_bugs', 'eq', 0),
        }),
        choice('p_scale', "The system can't keep up with growth", [set('pain_scale', 1), add('need_arch', 2), add('complexity', 3), add('pains', 1), add('fit', 1)], [], {
          showIf: cmp('pain_scale', 'eq', 0),
        }),
        choice('p_capacity', "We can't ship features fast enough", [set('pain_capacity', 1), add('need_dev', 2), add('pains', 1), add('fit', 1)], [], {
          showIf: cmp('pain_capacity', 'eq', 0),
        }),
        choice('p_done', "That's everything", [], [go('platforms')], { showIf: cmp('pains', 'gte', 1) }),
      ],
      [go('pains', cmp('pains', 'lt', 3), 'ask for another pain point'), go('platforms', undefined, 'three is enough')],
    ),

    question(
      'platforms',
      'Which platforms does the system run on?',
      '',
      [
        choice('pl_web', 'Web', [set('web', 1)]),
        choice('pl_mobile', 'Mobile (iOS / Android)', [set('mobile', 1)]),
        choice('pl_both', 'Both web and mobile', [set('web', 1), set('mobile', 1), add('complexity', 2)]),
        choice('pl_other', 'Mostly desktop, mainframe or embedded', [set('off_platform', 1)]),
      ],
      [go('off_platform', cmp('off_platform', 'eq', 1)), go('team', not(visited('team'))), go('budget')],
    ),

    question(
      'advice_topic',
      'What would you like advice on?',
      '',
      [
        choice('a_arch', 'Reviewing the architecture of an existing system', [add('need_arch', 2)]),
        choice('a_stack', 'Choosing a technology stack for a new product', [add('need_arch', 1), add('need_dev', 1)]),
        choice('a_devops', 'Cloud, CI/CD and DevOps strategy', [add('need_devops', 2)]),
        choice('a_qa', 'Test strategy and automation', [add('need_qa', 2)]),
      ],
      [go('adhoc_consult', cmp('size', 'lte', 2), 'small company'), go('advice_scope')],
    ),

    question(
      'advice_scope',
      'What kind of engagement are you after?',
      '',
      [
        choice('scope_oneoff', 'A one-off review with a written report', [], [go('arch_review')]),
        choice('scope_ongoing', 'Ongoing guidance alongside our team', [add('fit', 2)]),
        choice('scope_unsure', 'Not sure yet'),
      ],
      [go('budget')],
    ),

    router(
      'evaluate',
      'Pick a recommendation',
      [
        go('off_platform', cmp('off_platform', 'eq', 1)),
        go('diy_site', all(cmp('size', 'lte', 2), cmp('complexity', 'lte', 2)), 'small & simple'),
        go('adhoc_consult', all(cmp('size', 'lte', 2), any(cmp('budget', 'lte', 2), cmp('fit', 'lt', 3))), 'small company, limited budget'),
        go('full_delivery', all(cmp('fit', 'gte', 8), cmp('need_dev', 'gte', 2)), 'strong fit, needs delivery'),
        go('devops_engagement', all(cmp('fit', 'gte', 5), cmp('need_devops', 'gte', 2), cmp('need_devops', 'gte', 'need_qa')), 'DevOps is the main need'),
        go('qa_engagement', all(cmp('fit', 'gte', 5), cmp('need_qa', 'gte', 2)), 'testing is the main need'),
        go('arch_partnership', all(cmp('fit', 'gte', 5), cmp('need_arch', 'gte', 2)), 'architecture is the main need'),
        go('adhoc_consult', cmp('size', 'lte', 2), 'small company'),
        go('discovery_call'),
      ],
      'Order matters: the first matching rule wins. Compares counters with each other (need_devops ≥ need_qa).',
    ),

    // --- outcomes ---------------------------------------------------------

    outcome(
      'diy_site',
      'An off-the-shelf platform is your best bet',
      'neutral',
      'For a company website or a small shop a custom build would be overkill. **WordPress**, **Webflow**, **Squarespace** or **Shopify** will get you online in days, for a fraction of the cost.\n\nWe specialise in large, integration-heavy platforms – but if you would like an expert to sanity-check your plans, we also offer short ad-hoc consultations.',
      undefined,
      [choice('diy_consult', "I'd still like a short consultation", [], [go('adhoc_consult')])],
    ),
    outcome(
      'adhoc_consult',
      'Ad-hoc expert consultation',
      'positive',
      'Book a one- or two-hour session with one of our senior architects. Ideal for smaller teams that need a second opinion on technology choices, hosting, security or vendor proposals – no long-term commitment.',
      { label: 'Book a session', url: `${CONTACT}Ad-hoc%20consultation` },
    ),
    outcome(
      'full_delivery',
      'End-to-end delivery partnership',
      'positive',
      "You're right in our sweet spot (fit score {{fit}}, complexity {{complexity}}). We'd start with a two-week discovery workshop, then set up a cross-functional team – architects, web & mobile developers, DevOps and test engineers – to design, build and run your platform.",
      { label: 'Schedule a discovery workshop', url: `${CONTACT}Discovery%20workshop` },
    ),
    outcome(
      'devops_engagement',
      'DevOps & platform engineering',
      'positive',
      'Your biggest wins are in how software gets built, shipped and operated. Our DevOps engineers can set up CI/CD, infrastructure as code, observability and on-call practices alongside your team.',
      { label: 'Talk to a DevOps lead', url: `${CONTACT}DevOps` },
    ),
    outcome(
      'qa_engagement',
      'Testing & quality engineering',
      'positive',
      'We can introduce a test strategy, automate regression testing for web and mobile, and embed QA engineers into your teams so fewer bugs reach your users.',
      { label: 'Talk to a QA lead', url: `${CONTACT}Quality%20engineering` },
    ),
    outcome(
      'arch_partnership',
      'Architecture consulting',
      'positive',
      'A senior architect works with your team over several months: target architecture, scalability, integration strategy and technical governance.',
      { label: 'Talk to an architect', url: `${CONTACT}Architecture` },
    ),
    outcome(
      'arch_review',
      'Architecture review',
      'positive',
      'A fixed-scope review of your system (typically 2–3 weeks) ending with a written report and a prioritised roadmap.',
      { label: 'Request a review', url: `${CONTACT}Architecture%20review` },
    ),
    outcome(
      'discovery_call',
      "Let's talk",
      'neutral',
      "We can't tell from these answers alone – a 30-minute call with us will clear it up quickly.",
      { label: 'Book a call', url: `${CONTACT}Intro%20call` },
    ),
    outcome(
      'off_platform',
      "We're probably not the right partner",
      'negative',
      'We focus exclusively on web and mobile platforms, so for desktop, embedded or game development a specialised studio will serve you better.',
      undefined,
      [choice('off_also_web', 'We also have web or mobile needs', [set('off_platform', 0)], [go('explore')])],
    ),
    outcome(
      'curious',
      'Thanks for stopping by!',
      'neutral',
      'We help larger organisations design, build, ship and test web and mobile platforms. Come back any time.',
      undefined,
      [choice('curious_back', 'Actually, I do have a project in mind', [], [go('explore')])],
    ),
  ];

  return applyTranslations({
    schemaVersion: SCHEMA_VERSION,
    id: 'example-it-services',
    title: 'Kestrel Digital – are we the right partner?',
    description:
      'Example: helps a prospective customer decide whether to engage an IT services company that serves upper-mid to extra-large organisations (architecture, DevOps, development, testing for web & mobile).',
    startNodeId: 'start',
    variables,
    nodes,
  });
}
