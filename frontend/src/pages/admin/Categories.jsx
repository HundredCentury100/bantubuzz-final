import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/adminAPI';
import AdminLayout from '../../components/AdminLayout';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategories({ include_niches: true });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setImagePreview(null);
    setSelectedImage(null);
    reset({
      name: '',
      slug: '',
      description: '',
      display_order: 0,
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setImagePreview(category.image ? `${BASE_URL}${category.image}` : null);
    setSelectedImage(null);
    reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      display_order: category.display_order || 0,
      is_active: category.is_active
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('slug', data.slug || generateSlug(data.name));
      formData.append('description', data.description || '');
      formData.append('display_order', data.display_order || 0);
      formData.append('is_active', data.is_active);

      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(formData);
        toast.success('Category created successfully');
      }

      setShowModal(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.error || 'Failed to save category');
    }
  };

  const handleDelete = async (categoryId, categoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-dark">Categories</h1>
            <p className="text-gray-600 mt-2">Manage platform categories and niches</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-dark px-6 py-3 rounded-full font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="w-5 h-5" />
            Add Category
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all hover:scale-105 overflow-hidden"
            >
              {/* Category Image */}
              {category.image ? (
                <img
                  src={`${BASE_URL}${category.image}`}
                  alt={category.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <PhotoIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Category Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-dark">{category.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      category.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                  {category.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
                  <span className="font-medium">Order: {category.display_order}</span>
                  <span className="text-gray-400">#{category.slug}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(category)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-dark hover:bg-gray-800 text-white px-4 py-2.5 rounded-full font-medium transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-20">
            <PhotoIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">No categories found</p>
            <p className="text-gray-400 mb-6">Create your first category to get started!</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-dark px-6 py-3 rounded-full font-semibold transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Category
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                <h2 className="text-3xl font-bold text-dark mb-6">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Category Name */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Fashion & Style"
                      {...register('name', { required: 'Name is required' })}
                      onChange={(e) => {
                        if (!editingCategory) {
                          setValue('slug', generateSlug(e.target.value));
                        }
                      }}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">
                      Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="fashion-style"
                      {...register('slug', { required: 'Slug is required' })}
                    />
                    {errors.slug && (
                      <p className="mt-2 text-sm text-red-500">{errors.slug.message}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">URL-friendly identifier (lowercase, hyphens only)</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows="4"
                      placeholder="Brief description of this category..."
                      {...register('description')}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2">
                      Category Image
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-3 file:px-6
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-primary file:text-dark
                          hover:file:bg-primary/90
                          file:cursor-pointer file:transition-colors"
                      />
                      {imagePreview && (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-64 object-cover rounded-2xl"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Display Order & Active Status Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Display Order */}
                    <div>
                      <label className="block text-sm font-semibold text-dark mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0"
                        {...register('display_order', { valueAsNumber: true })}
                      />
                      <p className="mt-2 text-xs text-gray-500">Lower numbers appear first</p>
                    </div>

                    {/* Is Active */}
                    <div>
                      <label className="block text-sm font-semibold text-dark mb-2">
                        Status
                      </label>
                      <div className="flex items-center h-12">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            {...register('is_active')}
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">
                            Active
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-dark px-6 py-3 rounded-full font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary/90 text-dark px-6 py-3 rounded-full font-semibold transition-colors shadow-lg hover:shadow-xl"
                    >
                      {editingCategory ? 'Update' : 'Create'} Category
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
