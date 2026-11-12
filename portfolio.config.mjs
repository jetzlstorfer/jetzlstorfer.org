/**
 * Curation for the self-printing portfolio.
 *
 * Everything on the site is generated from public GitHub data and the public
 * Credly feed. GitHub pins pick the featured prints; this file is the only
 * other control. Every key is optional.
 */
export default {
  /** GitHub account the site is printed from. */
  login: 'jetzlstorfer',

  /** One line under the name. Falls back to the GitHub bio. */
  tagline: 'Solution Engineer at Microsoft Austria, Cloud Native Linz organizer, tech & music aficionado.',

  /**
   * Repositories to leave out completely: `name` for own repos,
   * `owner/name` for anything else.
   */
  exclude: ['jetzlstorfer', 'jetzlstorfer.github.io', 'jetzlstorfer.org'],

  /** Extra public repositories (`owner/name`) to print in the index. */
  include: [],

  /**
   * Repositories forced into the front run in addition to GitHub pins,
   * in this order. The run is otherwise the most recently pushed work.
   */
  featured: [],

  /** How many prints stand in the front run. */
  runSize: 8,

  /** Forks are skipped unless listed in `include`. */
  includeForks: false,

  /**
   * Repos pushed within this many months are printed in the main index;
   * older or archived ones move to the back catalogue.
   */
  recentMonths: 24,

  /**
   * Per-repo overrides keyed by `name` (own) or `owner/name`.
   * Supported keys: title, description, homepage, tags (array), image (URL), hidden.
   */
  overrides: {
    wichteln: { homepage: 'https://wichteln.jetzlstorfer.org' },
  },

  /** Credly user for the badge shelf. Set to null to drop the section. */
  credly: 'jetzlstorfer',

  /** Links printed in the masthead and the close. GitHub social accounts are merged in. */
  links: [
    { label: 'GitHub', url: 'https://github.com/jetzlstorfer' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/juergenetzlstorfer/' },
    { label: 'Cloud Native Linz', url: 'https://www.meetup.com/cloud-native-linz/' },
    { label: 'Medium', url: 'https://medium.com/@jetzlstorfer' },
    { label: 'Credly', url: 'https://www.credly.com/users/jetzlstorfer' },
  ],
};
