import React, { useEffect, useState } from 'react';
import { Package, Plus, Tag, Check, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { api } from '../api/client';
import { Modal } from '../components/Modal';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('software');
  const [salesPrice, setSalesPrice] = useState('1000.00');
  const [costPrice, setCostPrice] = useState('300.00');
  const [notes, setNotes] = useState('');

  // Variant Form state (Page 3 variant requirement!)
  const [variantName, setVariantName] = useState('Odoo Brand Edition');
  const [attrName, setAttrName] = useState('Brand');
  const [attrValue, setAttrValue] = useState('Odoo');
  const [priceExtra, setPriceExtra] = useState('560.00');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct({
        name,
        product_type: productType,
        sales_price: parseFloat(salesPrice),
        cost_price: parseFloat(costPrice),
        notes,
        variants: [
          {
            name: 'Standard Edition',
            attribute_name: 'Brand',
            attribute_value: 'Standard',
            price_extra: 0,
          },
        ],
      });
      setIsModalOpen(false);
      setName('');
      setNotes('');
      setNotification('Product created successfully!');
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    try {
      await api.addVariant(selectedProductId, {
        name: variantName,
        attribute_name: attrName,
        attribute_value: attrValue,
        price_extra: parseFloat(priceExtra),
      });
      setIsVariantModalOpen(false);
      setNotification(`Variant '${variantName}' added with +$${priceExtra} surcharge!`);
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Products & Variants
          </h1>
          <p className="text-sm text-slate-500">
            Define subscription software, services, add-ons, and pricing attribute variants (e.g., Odoo Brand +$560)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#583A50] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Grid of Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.product_type}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">{p.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-slate-900">${Number(p.sales_price).toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400">Cost: ${Number(p.cost_price).toFixed(2)}</p>
                </div>
              </div>

              {p.notes && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{p.notes}</p>}

              {/* Variants Section */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#714B67]" /> Pricing Variants ({p.variants.length})
                  </span>
                  <button
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setIsVariantModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#714B67] hover:underline"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-1.5">
                  {p.variants.map((v) => (
                    <div key={v.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-800">{v.name}</span>
                      <span className="font-mono font-bold text-purple-800">
                        {Number(v.price_extra) > 0 ? `+$${Number(v.price_extra).toFixed(2)}` : 'Included'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Product">
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Name</label>
            <input
              type="text"
              placeholder="e.g. Brightloop CRM Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="software">Software</option>
                <option value="service">Service</option>
                <option value="add_on">Add-on</option>
                <option value="consumable">Consumable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Sales Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Product descriptions, internal specifications..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Create Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Variant Modal (Page 3 requirement: "choosing the Odoo brand adds 560 to the price") */}
      <Modal isOpen={isVariantModalOpen} onClose={() => setIsVariantModalOpen(false)} title="Add Product Variant">
        <form onSubmit={handleAddVariant} className="space-y-4">
          <p className="text-xs text-slate-500">
            Configure attribute variants with custom price surcharges (e.g. Brand: Odoo Brand +$560.00).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Variant Name</label>
            <input
              type="text"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attribute Name</label>
              <input
                type="text"
                value={attrName}
                onChange={(e) => setAttrName(e.target.value)}
                placeholder="e.g. Brand, Tier, Cloud"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attribute Value</label>
              <input
                type="text"
                value={attrValue}
                onChange={(e) => setAttrValue(e.target.value)}
                placeholder="e.g. Odoo, Enterprise"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Price Extra Surcharge ($)</label>
            <input
              type="number"
              step="0.01"
              value={priceExtra}
              onChange={(e) => setPriceExtra(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVariantModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#714B67] hover:bg-[#583A50] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm"
            >
              Save Variant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

