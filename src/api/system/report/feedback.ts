import { Feedback, FeedbackQueryParams } from '/@/api/system/report/type'
import { del, get } from '/@/utils/request'

export default {
	list: (params?: FeedbackQueryParams): Promise<{list: Feedback[],total: number}> => get('/system/complaintFeedback/list', params),
	del: (ids: number[]): Promise<void> => del('/system/complaintFeedback/batch', {ids}),
}
