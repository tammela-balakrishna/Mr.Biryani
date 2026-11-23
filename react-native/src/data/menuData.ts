// Curated default menu catalog for Mr. Biryani.
// Matches the active database UUIDs in PostgreSQL menu_items so offline fallbacks & immediate renders
// always post valid UUIDs to the orders API.

export interface MenuItemData {
  id: string;
  categoryId?: string;
  name: string;
  price: number;
  description?: string;
  available?: boolean;
}

export interface MenuCategoryData {
  id: string;
  name: string;
  items: MenuItemData[];
}

export const DEFAULT_MENU: MenuCategoryData[] = [
  {
    id: '346e988e-438a-2741-eecd-08f57740b25c',
    name: 'Biryani (Serve for One)',
    items: [
      { id: '6b780b50-7a8e-80b3-94d2-fec1e5563d17', name: 'Hyderabadi Dum Biryani', price: 170, description: 'Traditional slow dum-cooked chicken with fragrant aged basmati rice and royal spices.', available: true },
      { id: '6f2fa89b-c15b-c2d4-423b-108709977154', name: 'Mr.Biryani Special', price: 200, description: 'Chef special boneless spicy chicken biryani infused with Andhra chili aroma.', available: true },
      { id: '646199df-094b-00d4-3d60-c34603d75e3f', name: 'Fry-Piece Chicken Biryani', price: 180, description: 'Crispy fried Andhra spiced chicken pieces layered over steaming biryani rice.', available: true },
      { id: '96d125f7-f8c7-4821-cc58-9b79254f292f', name: 'Guntur Chicken Biryani', price: 180, description: 'Fiery red chili marinade with authentic Guntur regional spices.', available: true },
      { id: '943e0a68-a602-f153-5306-9c5dbd9d8425', name: 'Nellore Chicken Biryani', price: 180, description: 'Coastal Andhra delicacy cooked with tangy gongura and hand-pounded spices.', available: true },
      { id: '1e0cc9fe-76e6-2ff9-9c3d-b2e7ef0e37ef', name: 'Mutton Biryani', price: 240, description: 'Tender baby mutton pieces marinated in rich curd and spices, slow dum-cooked.', available: true },
      { id: '992d10f4-85e2-5765-ddcc-648e19b3fb8c', name: 'Panner Biryani', price: 160, description: 'Fresh malai paneer cubes tossed in rich biryani gravy and aromatic rice.', available: true },
      { id: '672dbafd-e284-4e07-f54f-ebe294c2abcd', name: 'Egg Biryani', price: 130, description: 'Spiced boiled eggs simmered in rich gravy layered with basmati rice.', available: true },
      { id: '7db2e561-a3be-92a3-4c04-5db06c50037f', name: 'Lollipop Chicken Biryani', price: 180, description: 'Golden crispy chicken lollipops nestled in fragrant dum biryani rice.', available: true },
      { id: 'c0148870-cffe-6dbe-e5a2-2d9409a9f674', name: 'Mughlai Chicken Biryani', price: 200, description: 'Mildly spiced creamy Mughlai style biryani finished with brown onions and cashews.', available: true },
    ],
  },
  {
    id: 'b75a1e13-33f5-28e6-c875-2e685b8fd099',
    name: 'Non-Veg Starters',
    items: [
      { id: '88d525d0-1bac-1195-692e-6c3c017e4801', name: 'Andhra Chicken Fry', price: 180, description: 'Deep-fried chicken sauteed with curry leaves, green chilies, and crushed pepper.', available: true },
      { id: '3d91121b-b7db-3356-afb3-ab28af11b0ca', name: 'Andhra Chilly Chicken', price: 180, description: 'Spicy wok-tossed chicken chunks with Andhra green chilies and onions.', available: true },
      { id: 'd467b1d1-92f5-affb-834e-7ce227429eb2', name: 'Guntur Chicken Fry', price: 180, description: 'Hot and spicy roasted chicken flavored with authentic Guntur red chilies.', available: true },
      { id: 'dcee4c39-a65f-bb32-5333-6408545d7bcf', name: 'Nellore Chicken Fry', price: 180, description: 'Coastal Andhra special spiced chicken with intense garlic and pepper tempering.', available: true },
      { id: 'd0b75fb7-9f62-7371-b68e-e7479e7140cd', name: 'Chicken Ghee Roast', price: 180, description: 'Slow-roasted chicken in pure desi ghee with a rich tangy masala paste.', available: true },
      { id: '032adde3-228b-0983-de4e-43e3ebb9d45d', name: 'Andhra Mutton Fry', price: 240, description: 'Tender succulent mutton pieces dry roasted with caramelized onions and Andhra spices.', available: true },
      { id: 'd3dd81a8-dea0-59e7-a508-e6f53ffe5975', name: 'Mutton Pepper Dry', price: 240, description: 'Crushed black pepper and roasted spices coating soft boneless mutton.', available: true },
      { id: '05759be6-afc4-f225-213e-f1f8e9ff6329', name: 'Andhra Fish Fry', price: 220, description: 'Crispy pan-fried fish fillets coated with traditional Andhra spice marinade.', available: true },
      { id: 'bdd877b5-aea5-d376-b7a0-28de860c4505', name: 'Prawns Ghee Roast', price: 240, description: 'Juicy prawns tossed in aromatic ghee and fiery Kundapur-style masala.', available: true },
      { id: 'cce27d45-2676-daeb-1aa2-069afa1dbf75', name: 'Kshatriya Chicken Wings', price: 180, description: 'Crispy fried chicken wings tossed in secret spice mix.', available: true },
      { id: '98fb4cc7-12b9-71a0-9d31-7e33bd6729c4', name: 'Kakinada Chicken Fry', price: 180, description: 'Kakinada seaport style fried chicken sauteed with aromatic curry leaves.', available: true },
    ],
  },
  {
    id: '134b2164-e9ff-c2a4-3321-637bd860d0c2',
    name: 'Family Pack Biryani (Serve for 3 to 4 Persons)',
    items: [
      { id: 'da3e4eca-71ee-6458-1014-6bb49099947f', name: 'Hyderabadi Dum Biryani (Family)', price: 460, description: 'Generous feast of Hyderabadi dum biryani served with raita and mirchi ka salan.', available: true },
      { id: '80737202-fe00-6334-f658-efa9664cee29', name: 'Mr.Biryani Special (Family)', price: 550, description: 'Large portion of chef special chicken biryani perfect for 3 to 4 people.', available: true },
      { id: 'ff64440b-c494-dca2-2ac1-0c0742c9c8e7', name: 'Fry-Piece Chicken Biryani (Family)', price: 490, description: 'Heaping portions of biryani topped with double spicy fry pieces.', available: true },
      { id: '1c2a249d-a26a-9ffb-c133-052600918ac7', name: 'Guntur Chicken Biryani (Family)', price: 490, description: 'Family portion of Guntur spiced royal biryani.', available: true },
      { id: '60c11c84-d1f2-1848-0262-4902fd6752e2', name: 'Mutton Biryani (Family)', price: 670, description: 'Generous royal mutton biryani prepared with choice cuts and saffron rice.', available: true },
      { id: '6e6ba238-8a48-490a-63ee-42734b7b821e', name: 'Lollipop Chicken Biryani (Family)', price: 490, description: 'Family sized aromatic biryani served with crisp chicken lollipops.', available: true },
      { id: '6712c4e1-c91e-8112-0aee-92855b206a55', name: 'Mughlai Chicken Biryani (Family)', price: 550, description: 'Royal rich feast with rich dry fruits, mild creaminess, and tender chicken.', available: true },
    ],
  },
];
