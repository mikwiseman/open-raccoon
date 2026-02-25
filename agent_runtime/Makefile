.PHONY: proto test lint format clean

PROTO_DIR := protos
PROTO_OUT := src/raccoon_runtime/generated

proto:
	mkdir -p $(PROTO_OUT)
	python -m grpc_tools.protoc \
		-I$(PROTO_DIR) \
		--python_out=$(PROTO_OUT) \
		--grpc_python_out=$(PROTO_OUT) \
		--pyi_out=$(PROTO_OUT) \
		$(PROTO_DIR)/raccoon/agent/v1/*.proto
	touch $(PROTO_OUT)/__init__.py
	touch $(PROTO_OUT)/raccoon/__init__.py
	touch $(PROTO_OUT)/raccoon/agent/__init__.py
	touch $(PROTO_OUT)/raccoon/agent/v1/__init__.py
	# Fix generated grpc import to use the full package path
	sed -i '' 's/from raccoon\.agent\.v1 import/from raccoon_runtime.generated.raccoon.agent.v1 import/' \
		$(PROTO_OUT)/raccoon/agent/v1/agent_service_pb2_grpc.py

test:
	uv run pytest tests/ -v --cov=raccoon_runtime

lint:
	uv run ruff check src/ tests/

format:
	uv run ruff format src/ tests/

clean:
	rm -rf $(PROTO_OUT)/raccoon
	find . -type d -name __pycache__ -exec rm -rf {} +
