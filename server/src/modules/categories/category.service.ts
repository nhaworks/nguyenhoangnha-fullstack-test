import * as categoryRepository from './category.repository.js';

export async function getCategories(type?: string) {
  return categoryRepository.findCategories(type);
}
