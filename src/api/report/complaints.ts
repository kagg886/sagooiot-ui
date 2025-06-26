import { get, post, del, put } from '/@/utils/request';
import type {
  ComplaintListItem,
  Complaint,
  CreateComplaintRequest,
  UpdateComplaintRequest,
  ComplaintQueryParams
} from './type';

export default {
  // 获取投诉列表
  getList: (params?: ComplaintQueryParams): Promise<{ list: ComplaintListItem[], total: number }> =>
    get('/api/complaints', params),

  // 创建投诉
  add: (data: CreateComplaintRequest) => post('/complaints', data),

  // 获取投诉详情
  detail: (id: string): Promise<Complaint> => get(`/complaints/${id}`),

  // 更新投诉
  edit: (id: string, data: UpdateComplaintRequest) => put(`/complaints/${id}`, data),

  // 删除投诉
  del: (id: string) => del(`/complaints/${id}`)
};
