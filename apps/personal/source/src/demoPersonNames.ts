import type { ProductWorld } from './productModel';

// Fictional names for the existing clickdummy people. IDs, keys and authored text stay unchanged.
export const demoPersonNames: Record<string, { legacy: string; full: string }> = {
  thorben: { legacy: 'Thorben', full: 'Thorben Biesenbach' },
  antje: { legacy: 'Antje', full: 'Antje Sommer' },
  'antje-vif': { legacy: 'Antje', full: 'Antje Sommer' },
  alex: { legacy: 'Alex', full: 'Alex Morgan' },
  maya: { legacy: 'Maya', full: 'Maya Chen' },
  sam: { legacy: 'Sam', full: 'Sam Taylor' },
  leo: { legacy: 'Leo', full: 'Leo Hoffmann' },
  nina: { legacy: 'Nina', full: 'Nina Weber' },
  sofia: { legacy: 'Sofia', full: 'Sofia Rossi' },
  jules: { legacy: 'Jules', full: 'Jules Laurent' },
  amina: { legacy: 'Amina', full: 'Amina Haddad' },
  marco: { legacy: 'Marco', full: 'Marco Silva' },
  elena: { legacy: 'Elena', full: 'Elena Novak' },
  theo: { legacy: 'Theo', full: 'Theo Martin' },
  'maya-creator': { legacy: 'Maya Studio', full: 'Maya Bennett' },
  'kai-creator': { legacy: 'Kai Moves', full: 'Kai Andersen' },
  'lena-creator': { legacy: 'Lena Tables', full: 'Lena Fischer' },
};

export function withDemoPersonNames(world: ProductWorld): ProductWorld {
  let changed = false;
  const people = world.people.map(person => {
    const name = demoPersonNames[person.id];
    if (!name || person.name !== name.legacy) return person;
    changed = true;
    return { ...person, name: name.full };
  });
  const profiles = Object.fromEntries(Object.entries(world.profiles).map(([id, profile]) => {
    const name = demoPersonNames[id];
    if (!name || profile.name !== name.legacy) return [id, profile];
    changed = true;
    return [id, { ...profile, name: name.full }];
  }));
  return changed ? { ...world, people, profiles } : world;
}
