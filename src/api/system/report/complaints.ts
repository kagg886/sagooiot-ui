import { get, post, del, put } from '/@/utils/request'
import type {
  Complaint,
  CreateComplaintRequest,
  UpdateComplaintRequest,
  ComplaintQueryParams
} from './type';

export default {
  // 获取投诉列表
  getList: (params?: ComplaintQueryParams): Promise<{ list: Complaint[], total: number }> =>
    get('/system/complaint/list', params),

  // 创建投诉
  add: (data: CreateComplaintRequest) => post('/system/complaint/add', data),

  // 获取投诉详情
  detail: (id: number): Promise<Complaint> => get(`/system/complaint/get`, {id}),

  // 更新投诉
  edit: (data: UpdateComplaintRequest) => put(`/system/complaint/edit`,data),

  // 删除投诉
  del: (ids: number[]) => del(`/system/complaint/delete`, {ids})
};
