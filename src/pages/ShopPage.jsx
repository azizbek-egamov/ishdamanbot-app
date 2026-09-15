import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../hooks/useTelegram';
import { formatUZS } from '../utils/formatters';
import { getImageUrl } from '../utils/imageUrl';

export default function ShopPage() {
  const { user } = useAuth();
  const { haptic } = useTelegram();

  // Catalog state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // View state: null = Catalog, object = Product Details View
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Order configuration state
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [userNote, setUserNote] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Payment settings state
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [copiedCard, setCopiedCard] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // "Mening Buyurtmalarim" view
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // 1. Fetch products & categories
  const fetchProducts = async (cat = selectedCategory) => {
    setLoading(true);
    try {
      const url = cat && cat !== 'all' ? `/shop/products/?category=${encodeURIComponent(cat)}` : '/shop/products/';
      const res = await api.get(url);
      setProducts(res.data?.products || []);
      if (res.data?.categories) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error('Do\'kon mahsulotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch payment settings
  const fetchPaymentSettings = async () => {
    try {
      const res = await api.get('/shop/settings/');
      setPaymentSettings(res.data);
    } catch (err) {
      console.error('To\'lov rekvizitlarini olishda xatolik:', err);
    }
  };

  // 3. Fetch user orders
  const fetchMyOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get('/shop/orders/my/');
      setMyOrders(res.data || []);
    } catch (err) {
      console.error('Buyurtmalarni olishda xatolik:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPaymentSettings();
  }, []);

  // When product is clicked: switch to Product Details View (ALOHIDA SAHIFA)
  const handleOpenProduct = async (product) => {
    haptic.selection();
    setSelectedProduct(product);
    setLoadingDetails(true);
    setActiveImageIndex(0);
    setQuantity(1);
    setReceiptFile(null);
    setReceiptPreview(null);
    setOrderSuccess(null);
    setErrorMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Set default contact from user info
    if (user) {
      setContactInfo(user.username ? `@${user.username}` : (user.telegram_id ? String(user.telegram_id) : ''));
    }

    try {
      const res = await api.get(`/shop/products/${product.id}/`);
      setProductDetails(res.data);

      // Set default size and color if available
      if (res.data.available_sizes) {
        const sizes = res.data.available_sizes.split(',').map((s) => s.trim()).filter(Boolean);
        if (sizes.length > 0) setSelectedSize(sizes[0]);
      }
      if (res.data.available_colors) {
        const colors = res.data.available_colors.split(',').map((c) => c.trim()).filter(Boolean);
        if (colors.length > 0) setSelectedColor(colors[0]);
      }
    } catch (err) {
      console.error('Mahsulot tafsilotlarini yuklashda xatolik:', err);
      setProductDetails(product);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Back button handler
  const handleBackToCatalog = () => {
    haptic.selection();
    setSelectedProduct(null);
    setProductDetails(null);
    setOrderSuccess(null);
    setErrorMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Copy card number to clipboard
  const handleCopyCard = (cardNum) => {
    haptic.notification('success');
    const cleanNum = cardNum.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanNum);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  // Receipt file change
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Fayl hajmi 10 MB dan oshmasligi kerak!");
        return;
      }
      setReceiptFile(file);
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
      haptic.selection();
    }
  };

  // Remove receipt file
  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
    }
  };

  // Quantity adjust
  const handleQuantityChange = (delta) => {
    haptic.impact('light');
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      const stock = productDetails?.stock ?? -1;
      if (stock !== -1 && next > stock) {
        return stock;
      }
      return next;
    });
  };

  // Submit order
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!receiptFile) {
      setErrorMessage("Iltimos, to'lov kvitansiyasi (chek) skrinshotini yuklang!");
      haptic.notification('error');
      return;
    }

    if (productDetails?.product_type === 'physical' && !deliveryAddress.trim()) {
      setErrorMessage("Iltimos, kiyim/mahsulotni yetkazib berish manzilini kiriting!");
      haptic.notification('error');
      return;
    }

    setSubmitting(true);
    haptic.impact('medium');

    const formData = new FormData();
    formData.append('product_id', productDetails.id);
    formData.append('quantity', quantity);
    formData.append('payment_receipt', receiptFile);
    if (selectedSize) formData.append('selected_size', selectedSize);
    if (selectedColor) formData.append('selected_color', selectedColor);
    if (deliveryAddress) formData.append('delivery_address', deliveryAddress);
    if (contactInfo) formData.append('contact_info', contactInfo);
    if (userNote) formData.append('user_note', userNote);

    try {
      const res = await api.post('/shop/orders/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      haptic.notification('success');
      setOrderSuccess(res.data?.order);
      // Refresh user orders in background
      fetchMyOrders();
    } catch (err) {
      const msg = err.response?.data?.error || "Buyurtma yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.";
      setErrorMessage(msg);
      haptic.notification('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Format status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return { text: "Tasdiqlandi", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", icon: "check_circle" };
      case 'delivered':
        return { text: "Yetkazildi", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40", icon: "local_shipping" };
      case 'rejected':
        return { text: "Rad etildi", color: "bg-rose-500/20 text-rose-400 border-rose-500/40", icon: "cancel" };
      default:
        return { text: "Kutilmoqda", color: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: "schedule" };
    }
  };

  // ====================================================================
  // VIEW 1: MY ORDERS VIEW (Mening Buyurtmalarim)
  // ====================================================================
  if (showMyOrders) {
    return (
      <div className="min-h-screen bg-surface text-on-surface px-4 md:px-0 pt-20 md:pt-6 pb-28 max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-6 pt-2">
          <button
            type="button"
            onClick={() => setShowMyOrders(false)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/10 text-xs font-semibold transition-all active:scale-95 text-slate-300 hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Do'konga qaytish</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[22px]">receipt_long</span>
            <h1 className="font-headline font-bold text-base tracking-wide uppercase text-white">
              Mening Buyurtmalarim
            </h1>
          </div>
        </div>

        {loadingOrders ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-9 h-9 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></div>
            <span className="font-mono text-xs text-slate-400">Buyurtmalar yuklanmoqda...</span>
          </div>
        ) : myOrders.length === 0 ? (
          <div className="bg-[#12141c] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 my-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-[36px]">shopping_bag</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-white text-base">Hozircha buyurtmalar yo'q</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Do'kondan o'zingizga kerakli trading materiallari yoki rasmiy kiyimlarni tanlab buyurtma bering.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMyOrders(false)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-[#be0034] text-white text-xs font-bold uppercase tracking-wider shadow-neon-red active:scale-95 transition-all"
            >
              Do'konni Ko'rish
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {myOrders.map((ord) => {
              const badge = getStatusBadge(ord.status);
              return (
                <div
                  key={ord.id}
                  className="bg-[#12141e] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-lg"
                >
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-300">
                        #{ord.order_number}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.color}`}>
                      <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                      <span>{badge.text}</span>
                    </div>
                  </div>

                  {/* Product summary */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h4 className="font-headline font-semibold text-sm text-white line-clamp-1">
                        {ord.product_title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>Miqdori: <strong className="text-white">{ord.quantity} ta</strong></span>
                        {ord.selected_size && (
                          <span>O'lcham: <strong className="text-primary-fixed-dim">{ord.selected_size}</strong></span>
                        )}
                        {ord.selected_color && (
                          <span>Rang: <strong className="text-primary-fixed-dim">{ord.selected_color}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-headline font-bold text-sm text-primary-container">
                        {formatUZS(ord.total_amount)} UZS
                      </span>
                    </div>
                  </div>

                  {/* Physical Delivery address if present */}
                  {ord.delivery_address && (
                    <div className="bg-white/5 rounded-xl p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">location_on</span>
                      <span>Manzil: {ord.delivery_address}</span>
                    </div>
                  )}

                  {/* Approved Delivery Data (Download link or channel link or tracking) */}
                  {ord.status === 'approved' && ord.delivery_data && (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>Material / Havola taqdim etildi:</span>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 font-mono text-xs text-white break-all select-all border border-white/5">
                        {ord.delivery_data}
                      </div>
                      {ord.delivery_data.startsWith('http') && (
                        <a
                          href={ord.delivery_data}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wide transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Havolani Ochish / Yuklab Olish</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Delivered tracking if present */}
                  {ord.status === 'delivered' && ord.delivery_data && (
                    <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-200">
                      <span className="font-semibold text-cyan-400">Yetkazish ma'lumoti: </span>
                      <span className="font-mono">{ord.delivery_data}</span>
                    </div>
                  )}

                  {/* Rejection Note */}
                  {ord.status === 'rejected' && (
                    <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[18px] text-rose-400 shrink-0">info</span>
                      <div>
                        <span className="font-bold">Rad etish sababi: </span>
                        <span>{ord.admin_note || "To'lov cheki tasdiqlanmadi yoki mablag' kelib tushmadi."}</span>
                      </div>
                    </div>
                  )}

                  {/* Admin Note if approved */}
                  {ord.status === 'approved' && ord.admin_note && (
                    <div className="text-[11px] text-slate-400 italic bg-white/5 rounded-lg p-2">
                      <span className="font-semibold not-italic text-slate-300">Admin izohi: </span>
                      {ord.admin_note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ====================================================================
  // VIEW 2: PRODUCT DETAILS VIEW (ALOHIDA SAHIFA - NOT A MODAL!)
  // ====================================================================
  if (selectedProduct) {
    const prod = productDetails || selectedProduct;
    const rawImages = prod.images && prod.images.length > 0
      ? prod.images.map((im) => (typeof im === 'string' ? im : (im.image || '')))
      : (prod.primary_image ? [prod.primary_image] : []);
    const images = rawImages.map(getImageUrl).filter(Boolean);

    const activeImageSrc = images[activeImageIndex] || getImageUrl(prod.primary_image) || '';
    const sizes = prod.available_sizes
      ? prod.available_sizes.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const colors = prod.available_colors
      ? prod.available_colors.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const isPhysical = prod.product_type === 'physical';
    const hasDiscount = prod.original_price && Number(prod.original_price) > Number(prod.price);
    const totalPrice = Number(prod.price || 0) * quantity;

    return (
      <div className="min-h-screen bg-surface text-on-surface px-4 md:px-0 pt-20 md:pt-6 pb-32">
        {/* Top Sticky Navigation Bar with Back Button */}
        <div className="sticky top-[60px] md:top-[72px] z-30 bg-surface/90 backdrop-blur-md py-2.5 flex items-center justify-between border-b border-white/5 mb-6 max-w-6xl mx-auto">
          <button
            type="button"
            onClick={handleBackToCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Orqaga</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-primary-container/20 text-primary-fixed-dim border border-primary-container/30">
              {prod.category || 'Trading'}
            </span>
            {isPhysical ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Kiyim / Merch
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Raqamli Material
              </span>
            )}
          </div>
        </div>

        {/* Loading details spinner */}
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></div>
            <span className="font-mono text-xs text-slate-400">Mahsulot yuklanmoqda...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-lg lg:max-w-6xl mx-auto items-start">
            {/* Left Column: Gallery, Title, Price, Description */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {/* GALLERY SECTION */}
              <div className="flex flex-col gap-3">
                {/* Main Big Image */}
                <div className="w-full aspect-square rounded-3xl bg-[#12141e] border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center group">
                {activeImageSrc ? (
                  <img
                    src={activeImageSrc}
                    alt={prod.title}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                    <span className="material-symbols-outlined text-[48px]">image</span>
                    <span className="text-xs font-mono">Rasm mavjud emas</span>
                  </div>
                )}

                {/* Discount Ribbon */}
                {hasDiscount && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-primary-container to-[#be0034] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-neon-red">
                    CHEGIRMA
                  </div>
                )}

                {/* Stock Tag */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-slate-300">
                  {prod.stock === -1 ? "Mavjud (Cheksiz)" : `Zaxirada: ${prod.stock} ta`}
                </div>
              </div>

              {/* Thumbnails Carousel */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        setActiveImageIndex(idx);
                      }}
                      className={`w-16 h-16 rounded-xl border-2 shrink-0 overflow-hidden transition-all ${activeImageIndex === idx
                        ? 'border-primary-container shadow-neon-red scale-105'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                        }`}
                    >
                      <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TITLE & PRICING */}
            <div className="flex flex-col gap-2">
              <h1 className="font-headline font-bold text-xl text-white tracking-tight leading-snug">
                {prod.title}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="font-headline font-extrabold text-2xl text-primary-container">
                  {formatUZS(prod.price)} UZS
                </span>
                {hasDiscount && (
                  <span className="text-sm text-slate-500 line-through font-mono">
                    {formatUZS(prod.original_price)} UZS
                  </span>
                )}
              </div>
            </div>

            {/* DESCRIPTION */}
            {prod.description && (
              <div className="bg-[#12141f] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                <h3 className="font-headline font-semibold text-xs uppercase tracking-wider text-slate-400">
                  Mahsulot Tasnifi
                </h3>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {prod.description}
                </div>
              </div>
            )}
            </div>

            {/* Right Column: Options, Quantity, Payment/Checkout Form */}
            <div className="lg:col-span-6 flex flex-col gap-6">
            {/* PHYSICAL OPTIONS (Sizes & Colors) */}
            {isPhysical && (
              <div className="flex flex-col gap-4 bg-[#12141f] border border-white/5 rounded-2xl p-4">
                {/* Sizes */}
                {sizes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      O'lchamni tanlang: <strong className="text-primary-container">{selectedSize}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            haptic.selection();
                            setSelectedSize(sz);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${selectedSize === sz
                            ? 'bg-primary-container text-white shadow-neon-red scale-105'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {colors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Rangni tanlang: <strong className="text-primary-container">{selectedColor}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((cl) => (
                        <button
                          key={cl}
                          type="button"
                          onClick={() => {
                            haptic.selection();
                            setSelectedColor(cl);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedColor === cl
                            ? 'bg-white text-black font-bold shadow-md scale-105'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                        >
                          {cl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QUANTITY SELECTOR & TOTAL */}
            <div className="bg-[#12141f] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400">Soni</span>
                <span className="font-headline font-bold text-base text-white">
                  Jami: <span className="text-primary-container">{formatUZS(totalPrice)} UZS</span>
                </span>
              </div>

              <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono font-bold text-sm text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={prod.stock !== -1 && quantity >= prod.stock}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* ORDER SUCCESS SCREEN */}
            {orderSuccess ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 text-center flex flex-col items-center gap-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                  <span className="material-symbols-outlined text-[36px]">check_circle</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-headline font-bold text-lg text-white">
                    Buyurtmangiz qabul qilindi!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    To'lov chekingiz tekshirilishi uchun adminga yuborildi. Buyurtma holatini "Mening buyurtmalarim" bo'limida kuzatishingiz mumkin.
                  </p>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 w-full font-mono text-xs text-slate-300 flex justify-between">
                  <span>Buyurtma kodi:</span>
                  <strong className="text-emerald-400">#{orderSuccess.order_number}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMyOrders(true);
                    setSelectedProduct(null);
                    fetchMyOrders();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-headline font-bold text-xs uppercase tracking-wider transition-colors shadow-lg active:scale-95"
                >
                  Buyurtmalarimni Ko'rish
                </button>
              </div>
            ) : (
              /* CHECKOUT & PAYMENT FORM */
              <form onSubmit={handleSubmitOrder} className="flex flex-col gap-5">
                {/* Official Card Box */}
                <div className="bg-gradient-to-br from-[#161826] to-[#12141f] border border-primary-container/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      Rasmiy To'lov Rekviziti
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-fixed-dim text-[10px] font-bold">
                      {paymentSettings?.bank_name || 'Uzcard / Humo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-base font-bold text-white tracking-widest">
                        {paymentSettings?.card_number || '8600 4912 3456 7890'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {paymentSettings?.card_holder || 'AZIZBEK EGAMOV'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCard(paymentSettings?.card_number || '8600 4912 3456 7890')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary-container/80 text-white text-xs font-bold transition-all active:scale-95 shadow-neon-red"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedCard ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedCard ? 'Nusxalandi' : 'Nusxa'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {paymentSettings?.instructions ||
                      "Karta raqamiga to'lov qiling va to'lov cheki (kvitansiya) skrinshotini quyida yuklang."}
                  </p>
                </div>

                {/* Physical Delivery Address Input */}
                {isPhysical && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary-container">location_on</span>
                      Yetkazib berish manzili <span className="text-primary-container">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Viloyat, shahar/tuman, ko'cha va uy raqami"
                      className="w-full bg-[#12141f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-container transition-colors"
                    />
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">call</span>
                    Bog'lanish uchun Telegram yoki Telefon
                  </label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="@username yoki +998 90 123 45 67"
                    className="w-full bg-[#12141f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-container transition-colors font-mono"
                  />
                </div>

                {/* Receipt Upload Box */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary-container">receipt</span>
                    To'lov cheki (Skrinshot) <span className="text-primary-container">*</span>
                  </label>

                  {receiptPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-primary-container/50 bg-black/60 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={receiptPreview}
                          alt="Chek"
                          className="w-14 h-14 object-cover rounded-xl border border-white/10 shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-white truncate">
                            {receiptFile?.name || 'To\'lov cheki'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(receiptFile?.size / 1024).toFixed(0)} KB yuklandi
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                        title="Chekni o'chirish"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-white/15 hover:border-primary-container rounded-2xl cursor-pointer bg-[#12141f] hover:bg-[#151724] transition-all group">
                      <span className="material-symbols-outlined text-[32px] text-slate-400 group-hover:text-primary-container transition-colors mb-1">
                        add_photo_alternate
                      </span>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                        Chek skrinshotini yuklash
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                        JPG, PNG, HEIC (Maks: 10 MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Optional Note */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Qo'shimcha izoh (ixtiyoriy)
                  </label>
                  <textarea
                    rows={2}
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Adminga qo'shimcha xabaringiz bo'lsa yozing..."
                    className="w-full bg-[#12141f] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-container transition-colors resize-none"
                  />
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2 animate-shake">
                    <span className="material-symbols-outlined text-[18px] text-rose-400 shrink-0">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-container to-[#be0034] text-white font-headline font-bold text-sm uppercase tracking-wider shadow-neon-red disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Buyurtma yuborilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      <span>Chekni Yuborish &amp; Buyurtma Berish</span>
                    </>
                  )}
                </button>
              </form>
            )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====================================================================
  // VIEW 3: CATALOG VIEW (Mahsulotlar Vitrinasi)
  // ====================================================================
  return (
    <div className="flex flex-col gap-6 px-4 md:px-0 pt-20 md:pt-6 pb-28">
      {/* Cyberpunk Hero Banner Zone */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 md:p-8 flex flex-col gap-4 border border-white/5 shadow-2xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-container/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-secondary-container/15 blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping"></span>
            <span className="font-mono text-[11px] text-secondary tracking-widest uppercase font-semibold">
              ISHDAMAN OFFICIAL STORE // MERCH & TRADING
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setShowMyOrders(true);
              fetchMyOrders();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-highest/60 hover:bg-surface-container-highest border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-primary-container">receipt_long</span>
            <span>Buyurtmalarim</span>
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-2xl font-bold text-white tracking-tight uppercase leading-snug">
            Eksklyuziv Merch va <span className="text-primary-container neon-glow-red">Materiallar</span>
          </h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Professional trading materiallari, indikatorlar va rasmiy brend kiyimlari vitrinada.
          </p>
        </div>

        {/* Quick Value Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 pt-1 bg-surface-container-lowest/70 rounded-xl p-2.5 border border-white/5 shadow-inner">
          <div className="flex flex-col items-center text-center">
            <span className="font-headline text-xs text-white font-bold tracking-tight">100% Rasmiy</span>
            <span className="text-[10px] text-on-surface-variant font-mono">Sifat kafolati</span>
          </div>
          <div className="flex flex-col items-center text-center border-x border-white/10">
            <span className="font-headline text-xs text-secondary font-bold tracking-tight">Tezkor</span>
            <span className="text-[10px] text-secondary/80 font-mono">Yetkazib berish</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-headline text-xs text-white font-bold tracking-tight">Xavfsiz</span>
            <span className="text-[10px] text-on-surface-variant font-mono">Karta orqali</span>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setSelectedCategory('all');
              fetchProducts('all');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${selectedCategory === 'all'
              ? 'bg-gradient-to-r from-primary-container to-[#be0034] text-white shadow-neon-red font-bold'
              : 'bg-surface-container-low text-on-surface-variant border border-white/5 hover:text-white hover:border-white/20'
              }`}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                haptic.selection();
                setSelectedCategory(cat);
                fetchProducts(cat);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${selectedCategory === cat
                ? 'bg-gradient-to-r from-primary-container to-[#be0034] text-white shadow-neon-red font-bold'
                : 'bg-surface-container-low text-on-surface-variant border border-white/5 hover:text-white hover:border-white/20'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-2 border-primary-container border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-xs text-slate-400">Do'kon mahsulotlari yuklanmoqda...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-[#12141c] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 my-8">
          <span className="material-symbols-outlined text-[40px] text-slate-500">inventory_2</span>
          <h3 className="font-semibold text-white text-sm">Hozircha mahsulotlar topilmadi</h3>
          <p className="text-xs text-slate-400">Tez orada yangi mahsulotlar qo'shiladi.</p>
        </div>
      ) : (
        /* PRODUCT CARDS GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => {
            const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price);
            const isPhysical = p.product_type === 'physical';

            return (
              <div
                key={p.id}
                onClick={() => handleOpenProduct(p)}
                className="glass-card rounded-2xl p-3.5 flex flex-col justify-between gap-3 border border-white/10 hover:border-primary-container/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,81,101,0.15)] group cursor-pointer"
              >
                {/* Image & Badges */}
                <div className="relative w-full aspect-[4/3] rounded-xl bg-surface-container-lowest overflow-hidden flex items-center justify-center border border-white/5">
                  {p.primary_image ? (
                    <img
                      src={getImageUrl(p.primary_image)}
                      alt={p.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[36px] text-slate-600">image</span>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {isPhysical ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 backdrop-blur-md shadow-sm">
                        Kiyim / Merch
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-purple-950/90 text-purple-300 border border-purple-500/40 backdrop-blur-md shadow-sm">
                        Material
                      </span>
                    )}
                  </div>

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-primary-container to-[#be0034] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-neon-red">
                      CHEGIRMA
                    </div>
                  )}

                  {/* Stock pill */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-slate-300 border border-white/10">
                    {p.stock === -1 ? 'Mavjud' : `${p.stock} dona`}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono uppercase text-secondary tracking-wider font-semibold">
                    {p.category}
                  </span>
                  <h3 className="font-headline font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-primary-fixed-dim transition-colors">
                    {p.title}
                  </h3>
                  {p.short_description && (
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                      {p.short_description}
                    </p>
                  )}
                </div>

                {/* Price & Action Button */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="font-headline font-black text-base text-primary-container neon-glow-red">
                      {formatUZS(p.price)} UZS
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] text-slate-500 line-through font-mono">
                        {formatUZS(p.original_price)} UZS
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-container/20 group-hover:bg-primary-container border border-primary-container/30 text-primary-fixed-dim group-hover:text-white text-xs font-headline font-bold uppercase transition-all shadow-sm"
                  >
                    <span>Ko'rish</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
