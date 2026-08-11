"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Edit2, Trash2, Plus } from "lucide-react";
import {
  useGetMenuItemsQuery,
  useAddMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} from "@/services/private/menuitems";

export default function ManagerMenuPage() {
  const menuId = 1;
  const { data: items, isLoading, error } = useGetMenuItemsQuery(menuId);
  const menuItems = Array.isArray(items) ? items : items?.results || [];

  const [addMenuItem] = useAddMenuItemMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [deleteMenuItem] = useDeleteMenuItemMutation();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("Choose an image...");
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async () => {
    if (!name || !price) return;
    try {
      const formData = new FormData();
      formData.append("menuId", menuId);
      formData.append("name", name);
      formData.append("price", price);
      if (image) formData.append("image", image);

      if (editingId) {
        await updateMenuItem({ id: editingId, ...Object.fromEntries(formData) });
        setEditingId(null);
      } else {
        await addMenuItem({ menuId, formData });
      }
      setName(""); setPrice(""); setImage(null); setFileName("Choose an image...");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-4 md:p-10 max-w-4xl mx-auto bg-slate-50 min-h-screen font-sans">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-black mb-8 text-slate-900 tracking-tight"
      >
        Menu Management
      </motion.h1>

      {/* FORM SECTION */}
      <motion.div 
        className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm"
      >
        <h2 className="text-lg font-bold mb-6 text-slate-800">
          {editingId ? "Edit Item" : "Add New Menu Item"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            className="border border-slate-200 p-3 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-400" 
            placeholder="Item Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <input 
            className="border border-slate-200 p-3 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-400" 
            placeholder="Price (Rs)" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
          />
          
          {/* CUSTOM FILE INPUT */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 border border-slate-200 p-3 rounded-xl cursor-pointer hover:border-green-500 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-slate-500 text-sm truncate">{fileName}</span>
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  setImage(e.target.files[0]);
                  setFileName(e.target.files[0]?.name || "Choose an image...");
                }} 
              />
            </label>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSubmit}
            className="md:col-span-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
          >
            {editingId ? "Update Item" : "Add to Menu"}
          </motion.button>
        </div>
      </motion.div>

      {/* LIST SECTION */}
      <div className="space-y-4">
        <AnimatePresence>
          {menuItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-green-200 transition-all"
            >
              <div className="flex items-center gap-4">
                {item.image && <img src={item.image} className="w-16 h-16 object-cover rounded-xl border border-slate-100" />}
                <div>
                  <h3 className="font-bold text-slate-900">{item.name}</h3>
                  <p className="text-green-600 font-bold text-sm">Rs {item.price}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingId(item.id); setName(item.name); setPrice(item.price); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}