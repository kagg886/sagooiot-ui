import { ComplaintResolveHistory, ComplaintResolveHistoryInsertRequest } from '/@/api/system/report/type'
import { get, post } from '/@/utils/request'

export default {
	list: (id: number): Promise<ComplaintResolveHistory[]> => get('/system/complaint/records',{ticketNo: id}).then((res: {data: ComplaintResolveHistory[]}) => res.data),

	update:(params: ComplaintResolveHistoryInsertRequest) => post('/system/complaint/records/add', params)
}
