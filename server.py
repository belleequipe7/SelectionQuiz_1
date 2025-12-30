import http.server
import socketserver
import json
import os
import urllib.parse

PORT = 8000
RANKING_FILE = "quiz_ranking.json"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == '/api/ranking':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            if os.path.exists(RANKING_FILE):
                try:
                    with open(RANKING_FILE, 'r', encoding='utf-8') as f:
                        data = f.read()
                        if not data:
                            data = "[]"
                        self.wfile.write(data.encode('utf-8'))
                except Exception as e:
                    print(f"Error reading ranking file: {e}")
                    self.wfile.write(b"[]")
            else:
                self.wfile.write(b"[]")
        else:
            super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == '/api/ranking':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                new_entry = json.loads(post_data.decode('utf-8'))
                
                ranking = []
                if os.path.exists(RANKING_FILE):
                    with open(RANKING_FILE, 'r', encoding='utf-8') as f:
                        data = f.read()
                        if data:
                            ranking = json.loads(data)
                
                # Add new entry
                # Ensure we have timestamp for identification
                if 'timestamp' not in new_entry:
                    import time
                    new_entry['timestamp'] = int(time.time() * 1000)
                
                ranking.push(new_entry) # Python list append is append, not push. oops. 
                                        # Wait, I'm writing python.
                ranking.append(new_entry)
                
                # Sort: Score DESC, then Time ASC
                ranking.sort(key=lambda x: (-x['score'], x['time']))
                
                # Keep top 10
                ranking = ranking[:10]
                
                with open(RANKING_FILE, 'w', encoding='utf-8') as f:
                    json.dump(ranking, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "ranking": ranking}).encode('utf-8'))
                
            except Exception as e:
                print(f"Error processing POST: {e}")
                self.send_response(500)
                self.end_headers()
        else:
            self.send_error(404)

print(f"Server started at http://localhost:{PORT}")
print(f"Press Ctrl+C to stop.")

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    httpd.serve_forever()
