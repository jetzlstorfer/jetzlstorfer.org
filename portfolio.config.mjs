/**
 * Curation for the self-updating website portfolio.
 *
 * Everything on the site is generated from public GitHub data and the public
 * Credly feed. The featured list and GitHub pins control the featured websites.
 * Every key is optional.
 */
export default {
  /** GitHub account the site is updated from. */
  login: 'jetzlstorfer',

  /** One line under the name. Falls back to the GitHub bio. */
  tagline: 'Solution Engineer at Microsoft Austria, Cloud Native Linz organizer, tech & music aficionado.',

  /**
   * Repositories to leave out completely: `name` for own repos,
   * `owner/name` for anything else.
   */
  exclude: ['jetzlstorfer', 'jetzlstorfer.github.io', 'jetzlstorfer.org'],

  /** Extra public repositories (`owner/name`) to include in the index. */
  include: [],

  /**
   * Featured public repositories, in display order. Use `name` for your own
   * repos and `owner/name` for other repositories. GitHub pins and recent
   * repositories fill any remaining slots.
   */
  featured: [ 'splitty', 'wichteln', 'plattentests-go', 'music-timetraveler', 'wattpilot-exporter', 'cloudnativelinz/cloudnativelinz.github.io' ],

  /** How many websites to feature. */
  runSize: 8,

  /** Forks are skipped unless listed in `include`. */
  includeForks: false,

  /**
   * Repos pushed within this many months are eligible for automatic featuring;
   * older or archived ones are not automatically featured.
   */
  recentMonths: 24,

  /**
   * Per-repo overrides keyed by `name` (own) or `owner/name`.
   * Supported keys: title, description, homepage, tags (array), image (URL), hidden.
   */
  overrides: {
    'cloudnativelinz/cloudnativelinz.github.io': { title: 'cloudnativelinz.at' },
  },

  /** Credly user for the badge shelf. Set to null to drop the section. */
  credly: 'jetzlstorfer',

  /** Links shown in the masthead and footer. GitHub social accounts are merged in. */
  links: [
    { label: 'GitHub', url: 'https://github.com/jetzlstorfer' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/juergenetzlstorfer/' },
    { label: 'Cloud Native Linz', url: 'https://www.meetup.com/cloud-native-linz/' },
    { label: 'Medium', url: 'https://medium.com/@jetzlstorfer' },
    { label: 'Credly', url: 'https://www.credly.com/users/jetzlstorfer' },
  ],
};
