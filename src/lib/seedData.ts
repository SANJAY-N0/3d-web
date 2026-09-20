import { Product, Order } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Custom Monogram Keychain',
    slug: 'custom-monogram-keychain',
    description: 'Personalized dual-layer 3D printed keychain with embossed custom name, ultra-durable matte PLA+ finish, and premium nickel split ring.',
    price: 149,
    category: 'Keychains',
    material: 'eSUN PLA+ High Toughness',
    dimensions: '65 x 24 x 6 mm',
    print_time: '45 mins',
    available_colors: ['Matte Black', 'Electric Blue', 'Cyber Orange', 'Emerald Green', 'Arctic White', 'Pure White'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000001/3d-printing/products/prod-001/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000001/3d-printing/products/prod-001/main.jpg',
    public_id: '3d-printing/products/prod-001/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000001/3d-printing/products/prod-001/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000002/3d-printing/products/prod-001/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000003/3d-printing/products/prod-001/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000004/3d-printing/products/prod-001/gallery-3.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000001/3d-printing/products/prod-001/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000002/3d-printing/products/prod-001/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000003/3d-printing/products/prod-001/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000004/3d-printing/products/prod-001/gallery-3.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-001/main',
      '3d-printing/products/prod-001/gallery-1',
      '3d-printing/products/prod-001/gallery-2',
      '3d-printing/products/prod-001/gallery-3'
    ],
    model_type: 'mesh_keychain',
    is_available: true,
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    name: 'Geometric Hexagon Desk Planter',
    slug: 'geometric-hexagon-desk-planter',
    description: 'Modern parametric desktop planter with built-in drainage reservoir and water catchment tray. Perfect for small succulents and desk greens.',
    price: 249,
    category: 'Desk Accessories',
    material: 'Matte PolyTerra PLA',
    dimensions: '85 x 85 x 75 mm',
    print_time: '3h 15m',
    available_colors: ['Obsidian Black', 'Sand Dune', 'Forest Green', 'Slate Grey', 'Pure White', 'Arctic White'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000010/3d-printing/products/prod-002/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000010/3d-printing/products/prod-002/main.jpg',
    public_id: '3d-printing/products/prod-002/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000010/3d-printing/products/prod-002/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000011/3d-printing/products/prod-002/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000012/3d-printing/products/prod-002/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000013/3d-printing/products/prod-002/gallery-3.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000010/3d-printing/products/prod-002/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000011/3d-printing/products/prod-002/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000012/3d-printing/products/prod-002/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000013/3d-printing/products/prod-002/gallery-3.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-002/main',
      '3d-printing/products/prod-002/gallery-1',
      '3d-printing/products/prod-002/gallery-2',
      '3d-printing/products/prod-002/gallery-3'
    ],
    model_type: 'mesh_planter',
    is_available: true,
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-003',
    name: 'Articulated Mechanical Phone Stand',
    slug: 'articulated-phone-stand',
    description: 'Print-in-place foldable phone and tablet stand with dual viewing angles (45° / 60°), anti-slip base pads, and cable passthrough for charging.',
    price: 399,
    category: 'Phone Accessories',
    material: 'Bambu Lab PETG-CF (Carbon Fiber Reinforced)',
    dimensions: '95 x 70 x 18 mm (Folded)',
    print_time: '4h 10m',
    available_colors: ['Carbon Black', 'Cosmic Blue', 'Titanium Silver', 'Pure White'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000020/3d-printing/products/prod-003/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000020/3d-printing/products/prod-003/main.jpg',
    public_id: '3d-printing/products/prod-003/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000020/3d-printing/products/prod-003/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000021/3d-printing/products/prod-003/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000022/3d-printing/products/prod-003/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000023/3d-printing/products/prod-003/gallery-3.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000020/3d-printing/products/prod-003/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000021/3d-printing/products/prod-003/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000022/3d-printing/products/prod-003/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000023/3d-printing/products/prod-003/gallery-3.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-003/main',
      '3d-printing/products/prod-003/gallery-1',
      '3d-printing/products/prod-003/gallery-2',
      '3d-printing/products/prod-003/gallery-3'
    ],
    model_type: 'mesh_stand',
    is_available: true,
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-004',
    name: 'Voronoi Spiral Luminary Vase',
    slug: 'voronoi-spiral-luminary-vase',
    description: 'Intricate algorithmic Voronoi cage vase designed for ambient fairy lights or dried floral arrangements. Mesmerizing shadow casting.',
    price: 499,
    category: 'Decorative Items',
    material: 'Translucent PETG & Silk PLA',
    dimensions: '110 x 110 x 180 mm',
    print_time: '6h 45m',
    available_colors: ['Silk Gold', 'Opal White', 'Emerald Silk', 'Midnight Purple', 'Pure White'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000030/3d-printing/products/prod-004/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000030/3d-printing/products/prod-004/main.jpg',
    public_id: '3d-printing/products/prod-004/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000030/3d-printing/products/prod-004/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000031/3d-printing/products/prod-004/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000032/3d-printing/products/prod-004/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000033/3d-printing/products/prod-004/gallery-3.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000030/3d-printing/products/prod-004/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000031/3d-printing/products/prod-004/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000032/3d-printing/products/prod-004/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000033/3d-printing/products/prod-004/gallery-3.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-004/main',
      '3d-printing/products/prod-004/gallery-1',
      '3d-printing/products/prod-004/gallery-2',
      '3d-printing/products/prod-004/gallery-3'
    ],
    model_type: 'mesh_vase',
    is_available: true,
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-005',
    name: 'High-Detail Cyber Dragon Miniature',
    slug: 'cyber-dragon-miniature',
    description: 'Resin SLA ultra-high 0.03mm layer height miniature statue with crystal clear micro-textures, scales, and magnetic display base.',
    price: 299,
    category: 'Miniatures',
    material: '8K Photopolymer UV Resin',
    dimensions: '75 x 60 x 85 mm',
    print_time: '5h 20m',
    available_colors: ['Matte Grey (Primer Ready)', 'Neon Green Resin', 'Ruby Red Translucent', 'Pure White Resin'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000040/3d-printing/products/prod-005/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000040/3d-printing/products/prod-005/main.jpg',
    public_id: '3d-printing/products/prod-005/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000040/3d-printing/products/prod-005/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000041/3d-printing/products/prod-005/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000042/3d-printing/products/prod-005/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000043/3d-printing/products/prod-005/gallery-3.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000040/3d-printing/products/prod-005/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000041/3d-printing/products/prod-005/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000042/3d-printing/products/prod-005/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000043/3d-printing/products/prod-005/gallery-3.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-005/main',
      '3d-printing/products/prod-005/gallery-1',
      '3d-printing/products/prod-005/gallery-2',
      '3d-printing/products/prod-005/gallery-3'
    ],
    model_type: 'mesh_miniature',
    is_available: true,
    is_featured: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-006',
    name: 'Modular Honeycomb Desk Organizer',
    slug: 'modular-honeycomb-desk-organizer',
    description: 'Magnetic interlocking hexagonal modular cups for pens, SD cards, USB flash drives, sticky notes, and paperclips. Expandable endlessly.',
    price: 349,
    category: 'Desk Accessories',
    material: 'Recycled Matte PLA',
    dimensions: '140 x 120 x 70 mm',
    print_time: '4h 50m',
    available_colors: ['Matte Black', 'Ice Blue', 'Signal Yellow', 'Steel Grey', 'Pure White', 'Arctic White'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000050/3d-printing/products/prod-006/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000050/3d-printing/products/prod-006/main.jpg',
    public_id: '3d-printing/products/prod-006/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000050/3d-printing/products/prod-006/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000051/3d-printing/products/prod-006/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000052/3d-printing/products/prod-006/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000053/3d-printing/products/prod-006/gallery-3.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000050/3d-printing/products/prod-006/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000051/3d-printing/products/prod-006/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000052/3d-printing/products/prod-006/gallery-2.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000053/3d-printing/products/prod-006/gallery-3.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-006/main',
      '3d-printing/products/prod-006/gallery-1',
      '3d-printing/products/prod-006/gallery-2',
      '3d-printing/products/prod-006/gallery-3'
    ],
    model_type: 'mesh_organizer',
    is_available: true,
    is_featured: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-007',
    name: 'College Campus Crest / Mascot Badge',
    slug: 'college-mascot-badge',
    description: 'Multi-color filament swapped college emblem with magnetic clothes fastener. Perfect for club members, hackathons, and fest souvenirs.',
    price: 199,
    category: 'College Products',
    material: 'Multi-Color PLA (Bambu AMS)',
    dimensions: '55 x 55 x 5 mm',
    print_time: '1h 15m',
    available_colors: ['Dual Tone Gold/Navy', 'Silver/Black', 'Crimson/White', 'Pure White/Cyan'],
    image_url: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000060/3d-printing/products/prod-007/main.jpg',
    main_image: 'https://res.cloudinary.com/jushiok7/image/upload/v1711000060/3d-printing/products/prod-007/main.jpg',
    public_id: '3d-printing/products/prod-007/main',
    gallery_urls: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000060/3d-printing/products/prod-007/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000061/3d-printing/products/prod-007/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000062/3d-printing/products/prod-007/gallery-2.jpg'
    ],
    gallery_images: [
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000060/3d-printing/products/prod-007/main.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000061/3d-printing/products/prod-007/gallery-1.jpg',
      'https://res.cloudinary.com/jushiok7/image/upload/v1711000062/3d-printing/products/prod-007/gallery-2.jpg'
    ],
    gallery_public_ids: [
      '3d-printing/products/prod-007/main',
      '3d-printing/products/prod-007/gallery-1',
      '3d-printing/products/prod-007/gallery-2'
    ],
    model_type: 'mesh_keychain',
    is_available: true,
    is_featured: false,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-001',
    order_number: '3DP-2026-00124',
    customer_id: 'cust-001',
    product_id: 'prod-001',
    quantity: 2,
    unit_price: 149,
    total_amount: 298,
    customization: {
      customText: 'SANJAY - B.TECH',
      selectedColor: 'Electric Blue',
      specialInstructions: 'Please ensure high infill for durability.'
    },
    order_status: 'PENDING_PAYMENT_VERIFICATION',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    customer: {
      id: 'cust-001',
      name: 'Sanjay Kumar',
      phone: '9876543210',
      email: 'sanjay150724@gmail.com',
      college: 'National Institute of Technology',
      address: 'Hostel Block B, Room 304, Campus Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001'
    },
    payment: {
      id: 'pay-001',
      order_id: 'ord-001',
      amount: 298,
      upi_id: 'sanjayk@okaxis',
      transaction_id: 'UPI429810482019',
      screenshot_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      payment_status: 'SUBMITTED',
      created_at: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    }
  },
  {
    id: 'ord-002',
    order_number: '3DP-2026-00125',
    customer_id: 'cust-002',
    product_id: 'prod-003',
    quantity: 1,
    unit_price: 399,
    total_amount: 399,
    customization: {
      selectedColor: 'Carbon Black',
      specialInstructions: 'Tight hinge tolerance please.'
    },
    order_status: 'PAYMENT_VERIFIED',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    customer: {
      id: 'cust-002',
      name: 'Priya Sharma',
      phone: '9812345678',
      email: 'priya.sharma@gmail.com',
      college: 'IIIT',
      address: 'Department of CSE, Ground Floor',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500032'
    },
    payment: {
      id: 'pay-002',
      order_id: 'ord-002',
      amount: 399,
      upi_id: 'priyasharma@paytm',
      transaction_id: 'UPI399182371944',
      screenshot_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      payment_status: 'VERIFIED',
      verified_by: 'admin-1',
      verified_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    }
  },
  {
    id: 'ord-003',
    order_number: '3DP-2026-00126',
    customer_id: 'cust-003',
    product_id: 'prod-004',
    quantity: 1,
    unit_price: 499,
    total_amount: 499,
    customization: {
      selectedColor: 'Silk Gold',
      specialInstructions: 'Spiral vase mode print.'
    },
    order_status: 'PRINTING',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    customer: {
      id: 'cust-003',
      name: 'Aditya Varma',
      phone: '9988776655',
      college: 'Stall Visitor',
      address: 'Stall Booth #14, Science Block',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600036'
    },
    payment: {
      id: 'pay-003',
      order_id: 'ord-003',
      amount: 499,
      upi_id: 'adityav@gpay',
      transaction_id: 'UPI889201948201',
      payment_status: 'VERIFIED',
      verified_by: 'admin-1',
      verified_at: new Date(Date.now() - 86400000 + 1800000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    }
  }
];
