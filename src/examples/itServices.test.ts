import { describe, expect, it } from 'vitest';
import { availableChoices, playPath, startSession, choose, validateTree, reachableNodes } from '../core';
import { createItServicesTree } from './itServices';

const tree = createItServicesTree();
const end = (path: string[]) => playPath(tree, path);

describe('IT services example', () => {
  it('is valid and every node is reachable', () => {
    expect(validateTree(tree)).toEqual([]);
    expect(reachableNodes(tree).size).toBe(tree.nodes.length);
  });

  it('sends a small business wanting a website to WordPress & co.', () => {
    const s = end(['build', 'brochure', 's1']);
    expect(s.nodeId).toBe('diy_site');
    // ...but they can still ask for a consultation
    expect(choose(tree, s, 'diy_consult').nodeId).toBe('adhoc_consult');
  });

  it('recommends full delivery for a large company building a customer portal', () => {
    const s = end(['build', 'portal', 's5', 'int_many', 'team_none', 'b4', 'reg_yes']);
    expect(s.nodeId).toBe('full_delivery');
    expect(s.status).toBe('finished');
    expect(s.vars.fit).toBe(14);
  });

  it('a large company with a simple website still gets asked follow-ups', () => {
    const s = end(['build', 'brochure', 's4']);
    expect(s.nodeId).toBe('integrations');
  });

  it('loops on pain points, hiding picked ones, and recommends DevOps', () => {
    let s = end(['improve', 's3', 'p_release']);
    expect(s.nodeId).toBe('pains');
    const ids = availableChoices(tree, s).map((c) => c.id);
    expect(ids).not.toContain('p_release');
    expect(ids).toContain('p_done');
    s = end(['improve', 's3', 'p_release', 'p_outage', 'p_done', 'pl_web', 'team_strong', 'b3', 'reg_no']);
    expect(s.nodeId).toBe('devops_engagement');
  });

  it('moves on automatically after three pain points', () => {
    expect(end(['improve', 's4', 'p_bugs', 'p_scale', 'p_capacity']).nodeId).toBe('platforms');
  });

  it('routes QA-heavy needs to the testing engagement', () => {
    const s = end(['improve', 's4', 'p_bugs', 'p_done', 'pl_mobile', 'team_strong', 'b3', 'reg_yes']);
    expect(s.nodeId).toBe('qa_engagement');
  });

  it('small companies asking for advice get ad-hoc consulting', () => {
    expect(end(['advice', 's1', 'a_arch']).nodeId).toBe('adhoc_consult');
  });

  it('large companies can get a one-off review or ongoing guidance', () => {
    expect(end(['advice', 's4', 'a_arch', 'scope_oneoff']).nodeId).toBe('arch_review');
    expect(end(['advice', 's4', 'a_devops', 'scope_ongoing', 'b3', 'reg_no']).nodeId).toBe('devops_engagement');
    expect(end(['advice', 's4', 'a_arch', 'scope_ongoing', 'b3', 'reg_no']).nodeId).toBe('arch_partnership');
  });

  it('explorers are asked size once and then routed into a branch that skips it', () => {
    const s = end(['explore', 's4', 'x_build', 'omni']);
    expect(s.nodeId).toBe('integrations');
    expect(s.visits.size).toBe(1);
  });

  it('turns away off-platform work, but lets the user re-enter the tree', () => {
    const s = end(['improve', 's4', 'p_release', 'p_done', 'pl_other']);
    expect(s.nodeId).toBe('off_platform');
    const again = choose(tree, s, 'off_also_web');
    expect(again.nodeId).toBe('explore');
    expect(again.vars.off_platform).toBe(0);
  });

  it('random walks never hit a dead end and reach every outcome', () => {
    const reached = new Set<string>();
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 3000; i++) {
      let s = startSession(tree);
      for (let step = 0; step < 40 && s.status === 'active'; step++) {
        const options = availableChoices(tree, s);
        s = choose(tree, s, options[Math.floor(rand() * options.length)].id);
        reached.add(s.nodeId);
      }
      expect(s.status).not.toBe('error');
    }
    const outcomes = tree.nodes.filter((n) => n.kind === 'outcome').map((n) => n.id);
    for (const o of outcomes) expect(reached, o).toContain(o);
  });
});
