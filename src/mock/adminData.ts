/**
 * 管理员端模拟数据（演示用，可替换为真实后端接口）
 */

// ---------- 用户 ----------
export interface AdminUser {
  id: string
  name: string
  email: string
  role: '普通用户' | '知识管理员' | '超级管理员'
  status: 'active' | 'disabled'
  createdAt: string
  lastActive: string
  questions: number
}

export const users: AdminUser[] = [
  { id: 'u1', name: '林小智', email: 'linxz@zhiyuan.ai', role: '超级管理员', status: 'active', createdAt: '2026-08-01', lastActive: '2 分钟前', questions: 326 },
  { id: 'u2', name: '王文档', email: 'wangwd@zhiyuan.ai', role: '知识管理员', status: 'active', createdAt: '2026-08-03', lastActive: '1 小时前', questions: 158 },
  { id: 'u3', name: '赵提问', email: 'zhaot@zhiyuan.ai', role: '普通用户', status: 'active', createdAt: '2026-08-15', lastActive: '26 分钟前', questions: 89 },
  { id: 'u4', name: '钱测试', email: 'qiance@zhiyuan.ai', role: '普通用户', status: 'disabled', createdAt: '2026-09-02', lastActive: '6 天前', questions: 12 },
  { id: 'u5', name: '孙研发', email: 'sunyf@zhiyuan.ai', role: '普通用户', status: 'active', createdAt: '2026-09-20', lastActive: '3 小时前', questions: 204 },
  { id: 'u6', name: '周运营', email: 'zhouyy@zhiyuan.ai', role: '知识管理员', status: 'active', createdAt: '2026-10-01', lastActive: '昨天', questions: 45 },
  { id: 'u7', name: '吴游客', email: 'wuke@zhiyuan.ai', role: '普通用户', status: 'disabled', createdAt: '2026-10-09', lastActive: '10 分钟前', questions: 2 },
]

// ---------- 知识空间 ----------
export interface AdminSpace {
  id: string
  name: string
  desc: string
  docs: number
  vectors: number
  members: number
  owner: string
  createdAt: string
}

export const spaces: AdminSpace[] = [
  { id: 'sp1', name: '技术文档', desc: '平台架构、API 手册与开发规范', docs: 46, vectors: 12840, members: 12, owner: '孙研发', createdAt: '2026-08-01' },
  { id: 'sp2', name: '公司规章', desc: '人事制度、考勤与报销流程', docs: 18, vectors: 4210, members: 48, owner: '周运营', createdAt: '2026-08-02' },
  { id: 'sp3', name: '产品手册', desc: '产品使用说明与常见问题', docs: 32, vectors: 8650, members: 20, owner: '王文档', createdAt: '2026-08-10' },
  { id: 'sp4', name: '项目资料', desc: '项目立项与评审材料', docs: 12, vectors: 3060, members: 8, owner: '林小智', createdAt: '2026-09-15' },
]

// ---------- 文档解析 ----------
export interface AdminDoc {
  id: string
  name: string
  space: string
  owner: string
  chunks: number
  status: 'queued' | 'parsing' | 'vectorizing' | 'done' | 'failed'
  progress: number
  time: string
}

export const adminDocs: AdminDoc[] = [
  { id: 'ad1', name: 'RAG系统架构设计说明书_v3.pdf', space: '技术文档', owner: '孙研发', chunks: 128, status: 'done', progress: 100, time: '10-11 14:20' },
  { id: 'ad2', name: '智能问答产品白皮书.pdf', space: '产品手册', owner: '王文档', chunks: 210, status: 'parsing', progress: 62, time: '10-12 09:30' },
  { id: 'ad3', name: '向量数据库选型对比.md', space: '技术文档', owner: '孙研发', chunks: 18, status: 'vectorizing', progress: 85, time: '10-12 09:41' },
  { id: 'ad4', name: '2026秋招入职指南.pdf', space: '公司规章', owner: '周运营', chunks: 0, status: 'queued', progress: 0, time: '10-12 09:52' },
  { id: 'ad5', name: '传智杯评审细则（扫描版）.pdf', space: '项目资料', owner: '林小智', chunks: 0, status: 'failed', progress: 0, time: '10-10 16:44' },
  { id: 'ad6', name: '财务报销操作手册.pdf', space: '公司规章', owner: '周运营', chunks: 74, status: 'done', progress: 100, time: '10-09 11:02' },
  { id: 'ad7', name: 'Embedding模型性能测试报告.docx', space: '技术文档', owner: '孙研发', chunks: 64, status: 'done', progress: 100, time: '10-09 11:12' },
]

// ---------- 系统日志 ----------
export interface LogItem {
  id: string
  time: string
  level: 'INFO' | 'WARN' | 'ERROR'
  module: string
  message: string
}

export const logs: LogItem[] = [
  { id: 'l1', time: '2026-10-12 09:52:31', level: 'INFO', module: '文档解析', message: '文档「2026秋招入职指南.pdf」进入解析队列，排队位置 1' },
  { id: 'l2', time: '2026-10-12 09:41:08', level: 'INFO', module: '向量化', message: '文档「向量数据库选型对比.md」切片完成，共 18 片，开始向量化' },
  { id: 'l3', time: '2026-10-12 09:38:55', level: 'WARN', module: '模型服务', message: 'LLM 接口响应时间 3.2s，超过阈值 3s，建议关注' },
  { id: 'l4', time: '2026-10-12 09:30:12', level: 'INFO', module: '文档解析', message: '文档「智能问答产品白皮书.pdf」开始解析，预计切片 200+' },
  { id: 'l5', time: '2026-10-10 16:44:20', level: 'ERROR', module: '文档解析', message: '文档「传智杯评审细则（扫描版）.pdf」解析失败：无法提取文本，可能为扫描件，需开启 OCR' },
  { id: 'l6', time: '2026-10-10 15:22:41', level: 'WARN', module: '存储', message: '向量库磁盘使用率达到 78%，剩余 42GB' },
  { id: 'l7', time: '2026-10-10 14:05:09', level: 'INFO', module: '用户系统', message: '新用户注册：wuke@zhiyuan.ai' },
  { id: 'l8', time: '2026-10-10 10:31:47', level: 'INFO', module: '问答服务', message: '今日第 200 次问答请求处理完成，平均响应 1.8s' },
  { id: 'l9', time: '2026-10-09 18:12:33', level: 'ERROR', module: '问答服务', message: '检索超时：向量库连接池耗尽，已自动重试并恢复' },
]

// ---------- 反馈 ----------
export interface AdminFeedback {
  id: string
  user: string
  type: string
  title: string
  desc: string
  status: 'pending' | 'processing' | 'resolved'
  time: string
}

export const feedbacks: AdminFeedback[] = [
  { id: 'af1', user: '赵提问', type: '功能异常', title: '扫描版 PDF 解析失败', desc: '上传扫描版 PDF 后提示"解析失败"，希望支持 OCR。', status: 'processing', time: '2026-10-11 16:20' },
  { id: 'af2', user: '孙研发', type: '体验建议', title: '希望支持导出对话记录', desc: '建议增加将整段会话导出为 Markdown 的功能。', status: 'resolved', time: '2026-10-09 10:05' },
  { id: 'af3', user: '赵提问', type: '内容纠错', title: '年假规则回答与最新制度不一致', desc: '知识库里还是 2024 版制度，2026 版已调整为满 1 年 6 天。', status: 'pending', time: '2026-10-12 08:41' },
  { id: 'af4', user: '周运营', type: '体验建议', title: '希望文档支持批量上传', desc: '一次只能选一个文件太慢，希望支持文件夹上传。', status: 'pending', time: '2026-10-11 14:32' },
  { id: 'af5', user: '吴游客', type: '其他', title: '游客模式可以保存会话吗', desc: '游客身份提问后刷新就丢了，希望能临时保存。', status: 'processing', time: '2026-10-10 19:15' },
]
