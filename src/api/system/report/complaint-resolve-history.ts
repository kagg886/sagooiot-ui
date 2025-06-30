import { ComplaintResolveHistory } from '/@/api/system/report/type'
import { get } from '/@/utils/request'

export default {
	list: (id: number): Promise<ComplaintResolveHistory[]> => get('/system/complaint/records',{ticketNo: id}).then((res: {data: ComplaintResolveHistory[]}) => res.data)
}
