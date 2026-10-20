/*
 * Parakkat Nature Resort: menu list.
 *
 * This is the only file you edit to add, replace, reorder or hide a menu.
 * Each entry becomes a card on the page and a viewer at  index.html#<id>
 * (handy for QR codes: e.g. print a QR for .../#room-service in each room).
 *
 *   id          short URL-safe name, used in the link (#restaurant)
 *   title       name shown on the card and in the viewer
 *   label       small category line above the title
 *   description one line under the title
 *   file        path to the PDF, or null to show the card as "Coming soon"
 *   cover       cover image for the card (see menus/README.md for how to make one)
 *   updated     optional text, e.g. "October 2026"
 *
 * See menus/README.md for the step-by-step.
 */
window.PARAKKAT_MENUS = [
  {
    id: 'restaurant',
    title: 'Restaurant Menu',
    label: 'Dining',
    description: 'Our full dining menu, freshly prepared in our kitchen.',
    // Current menu. Replace with 'menus/pdf/restaurant.pdf' once the new PDF is added.
    file: 'NEW MENU PARAKKAT NATURE RESORT COMPRESSED.pdf',
    cover: 'menus/covers/restaurant.jpg',
    updated: ''
  },
  {
    id: 'room-service',
    title: 'Room Service',
    label: 'In-room dining',
    description: 'Dine in the comfort of your room.',
    file: 'ROOM SERVICE MENU PARAKKAT.pdf',
    cover: 'menus/covers/room-service.jpg',
    updated: ''
  },
  {
    id: 'spa',
    title: 'Ayurvedic Spa',
    label: 'Wellness',
    description: 'Embrace the healing touch of Ayurveda.',
    file: 'PARAKKAT AYURVEDIC SPA BROCHURE RE.pdf',
    cover: 'menus/covers/spa.jpg',
    updated: ''
  }
];
