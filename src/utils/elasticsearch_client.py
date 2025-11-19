"""
Cliente Elasticsearch para ThreatGuard
"""
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional
from elasticsearch import Elasticsearch

logger = logging.getLogger(__name__)

class ElasticsearchClient:
    def __init__(self):
        self.host = os.getenv('ELASTICSEARCH_HOST', 'localhost')
        self.port = int(os.getenv('ELASTICSEARCH_PORT', 9200))
        self.es = Elasticsearch(
            [f"http://{self.host}:{self.port}"],
            headers={"Accept": "application/json", "Content-Type": "application/json"}
        )
        self._create_indices()
    
    def _create_indices(self):
        """Crear índices si no existen"""
        alerts_mapping = {
            "mappings": {
                "properties": {
                    "timestamp": {"type": "date"},
                    "source": {"type": "keyword"},
                    "severity": {"type": "keyword"},
                    "title": {"type": "text"},
                    "description": {"type": "text"},
                    "ai_classification": {"type": "keyword"},
                    "ai_confidence": {"type": "float"},
                    "status": {"type": "keyword"},
                    "source_ip": {"type": "ip"},
                    "destination_ip": {"type": "ip"},
                    "raw_data": {"type": "object", "enabled": False}
                }
            }
        }
        
        try:
            if not self.es.indices.exists(index="threatguard-alerts"):
                self.es.indices.create(index="threatguard-alerts", body=alerts_mapping)
                logger.info("Índice threatguard-alerts creado")
        except Exception as e:
            logger.error(f"Error creando índices: {e}")
    
    def index_alert(self, alert_data: Dict) -> bool:
        """Indexar alerta en Elasticsearch"""
        try:
            self.es.index(index="threatguard-alerts", document=alert_data)
            return True
        except Exception as e:
            logger.error(f"Error indexando alerta: {e}")
            return False
    
    def search_alerts(self, query: str = None, severity: str = None, 
                     limit: int = 100, from_date: str = None) -> List[Dict]:
        """Buscar alertas"""
        must_conditions = []
        
        if query:
            must_conditions.append({
                "multi_match": {
                    "query": query,
                    "fields": ["title", "description"]
                }
            })
        
        if severity:
            must_conditions.append({"term": {"ai_classification": severity}})
        
        if from_date:
            must_conditions.append({
                "range": {"timestamp": {"gte": from_date}}
            })
        
        search_body = {
            "query": {"bool": {"must": must_conditions}} if must_conditions else {"match_all": {}},
            "sort": [{"timestamp": {"order": "desc"}}],
            "size": limit
        }
        
        try:
            response = self.es.search(index="threatguard-alerts", body=search_body)
            return [hit["_source"] for hit in response["hits"]["hits"]]
        except Exception as e:
            logger.error(f"Error buscando alertas: {e}")
            return []
    
    def get_stats(self) -> Dict:
        """Obtener estadísticas de alertas"""
        try:
            aggs_body = {
                "size": 0,
                "aggs": {
                    "by_severity": {"terms": {"field": "ai_classification"}},
                    "by_status": {"terms": {"field": "status"}}
                }
            }
            response = self.es.search(index="threatguard-alerts", body=aggs_body)
            return {
                "total": response["hits"]["total"]["value"],
                "by_severity": {b["key"]: b["doc_count"] for b in response["aggregations"]["by_severity"]["buckets"]},
                "by_status": {b["key"]: b["doc_count"] for b in response["aggregations"]["by_status"]["buckets"]}
            }
        except Exception as e:
            logger.error(f"Error obteniendo stats: {e}")
            return {}

es_client = ElasticsearchClient()
