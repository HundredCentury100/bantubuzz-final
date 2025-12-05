import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getCategories, createCategory, updateCategory, deleteCategory, getNiches } from '../services/adminAPI';
import AdminLayout from '../components/admin/AdminLayout';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function AdminCategories() {
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
      setCategories(response.data.categories);
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
      description: category.description,
      display_order: category.display_order,
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
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"? This will also delete all associated niches.`)) {
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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">Manage platform categories and niches</p>
          </div>
        <button onClick={openCreateModal} className="btn-primary">
          + Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            {/* Category Image */}
            {category.image ? (
              <img
                src={`${BASE_URL}${category.image}`}
                alt={category.name}
                className="w-full h-48 object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Category Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {category.description || 'No description'}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Order: {category.display_order}</span>
                <span>{category.niches_count} niches</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(category)}
                  className="flex-1 btn-outline text-sm py-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.id, category.name)}
                  className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No categories found. Create your first category!</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Fashion & Style"
                    {...register('name', { required: 'Name is required' })}
                    onChange={(e) => {
                      if (!editingCategory) {
                        setValue('slug', generateSlug(e.target.value));
                      }
                    }}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-error">{errors.name.message}</p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="fashion-style"
                    {...register('slug', { required: 'Slug is required' })}
                  />
                  {errors.slug && (
                    <p className="mt-1 text-sm text-error">{errors.slug.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">URL-friendly identifier</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="input"
                    rows="3"
                    placeholder="Brief description of this category..."
                    {...register('description')}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-dark
                      hover:file:bg-primary-light"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    {...register('display_order', { valueAsNumber: true })}
                  />
                  <p className="mt-1 text-xs text-gray-500">Lower numbers appear first</p>
                </div>

                {/* Is Active */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    {...register('is_active')}
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Active (visible on platform)
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
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
