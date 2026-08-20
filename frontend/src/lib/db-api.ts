/**
 * Database API Client - ZendBX Compatible
 * Routes all database calls through backend to avoid CORS issues
 * Provides ZendBX-compatible API: db.from(table).select().eq().order()
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ZendBX-compatible query builder
class QueryBuilder<T = any> {
  private tableName: string
  private baseURL: string
  private selectCols = '*'
  private filterParams: Record<string, string> = {}
  private orderParam?: string
  private limitParam?: number
  private updateData?: Record<string, any>
  private isDelete = false

  constructor(table: string, baseURL: string) {
    this.tableName = table
    this.baseURL = baseURL
  }

  select(columns = '*'): this {
    this.selectCols = columns
    return this
  }

  eq(column: string, value: any): this {
    this.filterParams[column] = value
    return this
  }

  neq(column: string, value: any): this {
    this.filterParams[`${column}_neq`] = value
    return this
  }

  gt(column: string, value: any): this {
    this.filterParams[`${column}_gt`] = value
    return this
  }

  gte(column: string, value: any): this {
    this.filterParams[`${column}_gte`] = value
    return this
  }

  lt(column: string, value: any): this {
    this.filterParams[`${column}_lt`] = value
    return this
  }

  lte(column: string, value: any): this {
    this.filterParams[`${column}_lte`] = value
    return this
  }

  like(column: string, value: string): this {
    this.filterParams[`${column}_like`] = value
    return this
  }

  ilike(column: string, value: string): this {
    this.filterParams[`${column}_ilike`] = value
    return this
  }

  in(column: string, values: any[]): this {
    this.filterParams[`${column}_in`] = JSON.stringify(values)
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'desc' : 'asc'
    this.orderParam = `${column}.${direction}`
    return this
  }

  limit(count: number): this {
    this.limitParam = count
    return this
  }

  private buildQueryString(): string {
    const params = new URLSearchParams()
    
    params.append('select', this.selectCols)
    
    if (Object.keys(this.filterParams).length > 0) {
      params.append('filters', JSON.stringify(this.filterParams))
    }
    
    if (this.orderParam) {
      params.append('order', this.orderParam)
    }
    
    if (this.limitParam !== undefined) {
      params.append('limit', this.limitParam.toString())
    }
    
    const query = params.toString()
    return query ? `?${query}` : ''
  }

  // For update operations - returns this for chaining
  update(data: Record<string, any>): this {
    this.updateData = data
    return this
  }

  // For delete operations - sets delete flag and returns this for chaining
  delete(): this {
    this.isDelete = true
    return this
  }

  async execute(): Promise<{ data: T[] | null; error: any }> {
    try {
      // Handle delete operations
      if (this.isDelete) {
        const response = await fetch(
          `${this.baseURL}/${this.tableName}?filters=${encodeURIComponent(JSON.stringify(this.filterParams))}`,
          {
            method: 'DELETE'
          }
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          return { data: null, error: new Error(errorText || response.statusText) }
        }
        
        return { data: null, error: null }
      }

      // Handle update operations
      if (this.updateData) {
        const response = await fetch(
          `${this.baseURL}/${this.tableName}?filters=${encodeURIComponent(JSON.stringify(this.filterParams))}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.updateData)
          }
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          return { data: null, error: new Error(errorText || response.statusText) }
        }
        
        const result = await response.json()
        return { data: result, error: null }
      }

      // Handle select operations
      const queryString = this.buildQueryString()
      const response = await fetch(`${this.baseURL}/${this.tableName}${queryString}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: new Error(errorText || response.statusText) }
      }
      
      const data = await response.json()
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Alias for execute() - some code uses .then() directly
  then<TResult1 = { data: T[] | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  // For insert operations
  async insert(data: Record<string, any> | Record<string, any>[]): Promise<{ data: T[] | null; error: any }> {
    try {
      const response = await fetch(`${this.baseURL}/${this.tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: new Error(errorText || response.statusText) }
      }
      
      const result = await response.json()
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

}

// ZendBX-compatible database client
class DatabaseClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = `${baseURL}/api/db`
  }

  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table, this.baseURL)
  }

  async rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<{ data: T | null; error: any }> {
    try {
      const response = await fetch(`${this.baseURL}/rpc/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: new Error(errorText || response.statusText) }
      }
      
      const data = await response.json()
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

// Export ZendBX-compatible client
export const db = new DatabaseClient(API_BASE_URL)

// Export dbApi for backwards compatibility
export const dbApi = db
